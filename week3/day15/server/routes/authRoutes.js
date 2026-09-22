const express = require("express");
const router = express.Router();
const passport = require("../middleware/oauth");
const { authService, authenticate } = require("../middleware/auth");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "user" } = req.body;
    await authService.validatePassword(password);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User already exists", 400);
    }
    const user = new User({
      name,
      email,
      password,
      role,
    });
    await user.save();
    const tokens = await authService.generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).select(
      "+password",
    );
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }
    const isPasswordValid = await authService.comparePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }
    user.lastLogin = new Date();
    await user.save();
    const tokens = await authService.generateTokens(user);
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }
    const tokens = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res, next) => {
    try {
      const tokens = await authService.generateTokens(req.user);
      res.json({
        success: true,
        message: "Google authentication successful",
        data: {
          user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          },
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
  }),
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  async (req, res, next) => {
    try {
      const tokens = await authService.generateTokens(req.user);
      res.json({
        success: true,
        message: "Facebook authentication successful",
        data: {
          user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          },
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  async (req, res, next) => {
    try {
      const tokens = await authService.generateTokens(req.user);
      res.json({
        success: true,
        message: "GitHub authentication successful",
        data: {
          user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          },
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/me", authenticate, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
        isActive: req.user.isActive,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/change-password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const isCurrentPasswordValid = await authService.comparePassword(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }
    await authService.validatePassword(newPassword);
    user.password = newPassword;
    await user.save();
    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
