const express = require("express");
const router = express.Router();
const User = require("../../../models/User");
const postgresql = require("../../../database/postgresql");
const { authenticate, authorize } = require("../../../middleware/auth");
const { cache } = require("../../../middleware/caching");

// Analytics fans out per spec UML: users from MongoDB, products/orders from PostgreSQL.
router.use(authenticate);
router.use(authorize("admin"));

async function pgCount(table) {
  const res = await postgresql.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
  return res.rows[0].total;
}

router.get("/", cache(30), async (req, res, next) => {
  try {
    const [users, products, orders] = await Promise.all([
      User.countDocuments(),
      pgCount("products"),
      pgCount("orders"),
    ]);
    res.json({ success: true, data: { users, products, orders } });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const total = await User.countDocuments();
    res.json({ success: true, data: { total } });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const total = await pgCount("products");
    res.json({ success: true, data: { total } });
  } catch (error) {
    next(error);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const total = await pgCount("orders");
    res.json({ success: true, data: { total } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
