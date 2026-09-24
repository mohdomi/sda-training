const express = require("express");
const router = express.Router();
const userService = require("../../../services/userService");
const productService = require("../../../services/productService");
const orderService = require("../../../services/orderService");
const { authMiddleware, authorize } = require("../../../middleware/auth");

router.use(authMiddleware);
router.use(authorize("admin"));

router.get("/", async (req, res, next) => {
  try {
    const users = await userService.getAllUsers({ limit: 1 });
    const products = await productService.getAllProducts({ limit: 1 });
    const orders = await orderService.getAllOrders({ limit: 1 });

    res.json({
      success: true,
      data: {
        users: users.pagination.total,
        products: products.pagination.total,
        orders: orders.pagination.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const result = await userService.getAllUsers({ limit: 1 });

    res.json({
      success: true,
      data: {
        total: result.pagination.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const result = await productService.getAllProducts({ limit: 1 });

    res.json({
      success: true,
      data: {
        total: result.pagination.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders({ limit: 1 });

    res.json({
      success: true,
      data: {
        total: result.pagination.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
