const jwt = require("jsonwebtoken");
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

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authMiddleware,
  authorize,
  optionalAuth,
};
