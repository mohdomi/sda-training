const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../../../models/User");
const {
  authService,
  authenticate,
  authorize,
} = require("../../../middleware/auth");
const { AppError } = require("../../../middleware/errorHandler");
const {
  validateUser,
  validateLogin,
  validatePagination,
  handleValidationErrors,
} = require("../../../middleware/validation");

// Single source of truth for users: MongoDB via Mongoose.
// The legacy in-memory services/userService.js is deprecated and no longer used here.
// Canonical auth lives at /api/v1/auth/*; these /users/register|login routes are
// kept as thin Mongo-backed proxies so old clients don't break.

const isMongoIdLike = (v) => /^[0-9a-fA-F]{24}$/.test(v || "");
const assertUserId = (id) => {
  // tests/api.test.js expects 404 (not 400) for GET /users/invalid-id
  if (!isMongoIdLike(id)) throw new AppError("User not found", 404);
};

const serializeUser = (u) => ({
  id: u._id,
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: u.avatar ?? null,
  isActive: u.isActive,
  lastLogin: u.lastLogin ?? null,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// Partial validators for updates (full validateUser requires password — wrong for PATCH-style updates)
const validateUserUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("role")
    .optional()
    .isIn(["user", "admin", "moderator"])
    .withMessage("Role must be user, admin, or moderator"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  handleValidationErrors,
];

router.post("/register", validateUser, async (req, res, next) => {
  try {
    const { name, email, password, role = "user" } = req.body;
    await authService.validatePassword(password);
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError("User already exists", 400);
    const user = new User({ name, email, password, role });
    await user.save();
    const tokens = await authService.generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { user: serializeUser(user), ...tokens },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).select(
      "+password",
    );
    if (!user) throw new AppError("Invalid credentials", 401);
    const ok = await authService.comparePassword(password, user.password);
    if (!ok) throw new AppError("Invalid credentials", 401);
    user.lastLogin = new Date();
    await user.save();
    const tokens = await authService.generateTokens(user);
    res.json({
      success: true,
      message: "Login successful",
      data: { user: serializeUser(user), ...tokens },
    });
  } catch (error) {
    next(error);
  }
});

// Everything below requires a DB-backed session (req.user = Mongoose doc)
router.use(authenticate);

router.get("/profile", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError("User not found", 404);
    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", validateUserUpdate, async (req, res, next) => {
  try {
    const allowed = ["name", "email", "avatar"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) req.user[k] = req.body[k];
    }
    await req.user.save();
    const fresh = await User.findById(req.user._id);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: serializeUser(fresh),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/profile", async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    // Stateless JWT: logout is client-side token discard (no server blacklist yet)
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a paginated list of users with optional filtering
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", authorize("admin"), validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined)
      filters.isActive = isActive === "true" || isActive === true;
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const total = await User.countDocuments(filters);
    const docs = await User.find(filters)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({
      success: true,
      data: {
        users: docs.map(serializeUser),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", authorize("admin"), async (req, res, next) => {
  try {
    assertUserId(req.params.id);
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", authorize("admin"), validateUserUpdate, async (req, res, next) => {
  try {
    assertUserId(req.params.id);
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    for (const k of ["name", "email", "role", "isActive", "avatar"]) {
      if (req.body[k] !== undefined) user[k] = req.body[k];
    }
    await user.save();
    res.json({
      success: true,
      message: "User updated successfully",
      data: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authorize("admin"), async (req, res, next) => {
  try {
    assertUserId(req.params.id);
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
