const express = require("express");
const router = express.Router();
const userService = require("../services/userService");
const { authMiddleware, authorize } = require("../middleware/auth");
const {
  validateUser,
  validateLogin,
  validateId,
  validatePagination,
} = require("../middleware/validation");

router.post("/register", validateUser, async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await userService.authenticateUser(email, password);

    res.json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.use(authMiddleware);

router.get("/profile", async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", validateUser, async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.userId, req.body);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/profile", async (req, res, next) => {
  try {
    await userService.deleteUser(req.user.userId);
    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await userService.logout(req.user.userId);
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/",
  authorize("admin"),
  validatePagination,
  async (req, res, next) => {
    try {
      const { page, limit, sort, order, role, isActive } = req.query;
      const filters = { role, isActive };
      const options = { page, limit, sort, order };

      const result = await userService.getAllUsers(filters, options);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", authorize("admin"), validateId, async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  authorize("admin"),
  validateId,
  validateUser,
  async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  authorize("admin"),
  validateId,
  async (req, res, next) => {
    try {
      await userService.deleteUser(req.params.id);
      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
