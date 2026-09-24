const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { AppError } = require("./errorHandler");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Access token is required", 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(new AppError("Invalid token", 401));
    } else if (error.name === "TokenExpiredError") {
      next(new AppError("Token expired", 401));
    } else {
      next(error);
    }
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Insufficient permissions", 403));
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
  }

  async generateTokens(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: "sda-training-api",
      audience: "sda-training-client",
    });

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        type: "refresh",
      },
      this.jwtSecret,
      {
        expiresIn: this.refreshTokenExpiresIn,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: "sda-training-api",
        audience: "sda-training-client",
      });

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AppError("Token expired", 401);
      } else if (error.name === "JsonWebTokenError") {
        throw new AppError("Invalid token", 401);
      }

      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);

      if (decoded.type !== "refresh") {
        throw new AppError("Invalid refresh token", 401);
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError("User not found or inactive", 401);
      }

      return await this.generateTokens(user);
    } catch (error) {
      throw new AppError("Invalid refresh token", 401);
    }
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!hasLowerCase) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!hasNumbers) {
      errors.push("Password must contain at least one number");
    }
    if (!hasSpecialChar) {
      errors.push("Password must contain at least one special character");
    }

    if (errors.length > 0) {
      throw new AppError("Password validation failed", 400, errors);
    }

    return true;
  }
}

const authService = new AuthService();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Access token is required", 401);
    }

    const token = authHeader.substring(7);
    const decoded = await authService.verifyToken(token);

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError("User not found or inactive", 401);
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authService,
  authenticate,
  authMiddleware,
  authorize,
  optionalAuth,
};
