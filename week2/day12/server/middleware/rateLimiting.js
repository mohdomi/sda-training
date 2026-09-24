const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
        limit: 100,
        remaining: 0,
      },
    });
  },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many requests to sensitive endpoint, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many login attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const apiKeyLimiter = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return next();
  }
  const limits = {
    free: { max: 100, windowMs: 15 * 60 * 1000 },
    premium: { max: 1000, windowMs: 15 * 60 * 1000 },
    enterprise: { max: 10000, windowMs: 15 * 60 * 1000 },
  };

  const limit = limits[apiKey] || limits["free"];

  const limiter = rateLimit({
    windowMs: limit.windowMs,
    max: limit.max,
    message: {
      error: "API key rate limit exceeded",
      retryAfter: `${limit.windowMs / 1000 / 60} minutes`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  limiter(req, res, next);
};

module.exports = {
  generalLimiter,
  strictLimiter,
  loginLimiter,
  apiKeyLimiter,
};
