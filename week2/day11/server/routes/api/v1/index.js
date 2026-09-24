const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes");
const productRoutes = require("./productRoutes");
const orderRoutes = require("./orderRoutes");
const analyticsRoutes = require("./analyticsRoutes");

const apiVersion = (req, res, next) => {
  req.apiVersion = "v1";
  next();
};

const contentNegotiation = (req, res, next) => {
  const accept = req.headers.accept || "application/json";

  if (accept.includes("application/json")) {
    req.responseFormat = "json";
  } else if (accept.includes("application/xml")) {
    req.responseFormat = "xml";
  } else {
    req.responseFormat = "json";
  }

  next();
};

router.get("/", (req, res) => {
  res.json({
    name: "SDA Training API",
    version: "1.0.0",
    description: "Advanced backend API for SDA training program",
    endpoints: {
      users: "/api/v1/users",
      products: "/api/v1/products",
      orders: "/api/v1/orders",
      analytics: "/api/v1/analytics",
    },
    documentation: "/api/v1/docs",
    status: "operational",
  });
});

router.use(apiVersion);
router.use(contentNegotiation);

router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/analytics", analyticsRoutes);

module.exports = router;
