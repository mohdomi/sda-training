const { AppError } = require("./errorHandler");

const PERMISSIONS = {
  // User permissions
  "users:read": ["admin", "moderator"],
  "users:write": ["admin"],
  "users:delete": ["admin"],

  // Product permissions
  "products:read": ["admin", "moderator", "user"],
  "products:write": ["admin", "moderator"],
  "products:delete": ["admin"],

  // Order permissions
  "orders:read": ["admin", "moderator", "user"],
  "orders:write": ["admin", "moderator", "user"],
  "orders:delete": ["admin"],

  // Analytics permissions
  "analytics:read": ["admin", "moderator"],
  "analytics:write": ["admin"],

  // System permissions
  "system:read": ["admin"],
  "system:write": ["admin"],
  "system:delete": ["admin"],
};

const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;

  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;

  return allowedRoles.includes(user.role);
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!hasPermission(req.user, permission)) {
      return next(new AppError("Insufficient permissions", 403));
    }

    next();
  };
};

const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const hasAnyPermission = permissions.some((permission) =>
      hasPermission(req.user, permission),
    );

    if (!hasAnyPermission) {
      return next(new AppError("Insufficient permissions", 403));
    }

    next();
  };
};

const requireAllPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const hasAllPermissions = permissions.every((permission) =>
      hasPermission(req.user, permission),
    );

    if (!hasAllPermissions) {
      return next(new AppError("Insufficient permissions", 403));
    }

    next();
  };
};

const requireOwnership = (resourceField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    // Admin can access any resource
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceField] || req.body[resourceField];
    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      return next(new AppError("Access denied: insufficient permissions", 403));
    }

    next();
  };
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Insufficient role permissions", 403));
    }

    next();
  };
};

module.exports = {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnership,
  requireRole,
};
