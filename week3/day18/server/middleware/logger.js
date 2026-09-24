const logger = (req, res, next) => {
  console.log({
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.userId,
    timestamp: new Date().toISOString(),
  });

  next();
};

module.exports = logger;
