const express = require("express");
const router = express.Router();
const orderService = require("../../../services/orderService");
const { authMiddleware, authorize } = require("../../../middleware/auth");
const { AppError } = require("../../../middleware/errorHandler");
const {
  validateOrder,
  validateId,
  validatePagination,
} = require("../../../middleware/validation");

router.use(authMiddleware);

router.post("/", validateOrder, async (req, res, next) => {
  try {
    const order = await orderService.createOrder({
      ...req.body,
      userId: req.user.userId,
    });
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/my", async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.userId);
    res.json({
      success: true,
      data: orders,
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
      const result = await orderService.getAllOrders(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", validateId, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (order.userId !== req.user.userId && req.user.role !== "admin") {
      return next(new AppError("Insufficient permissions", 403));
    }
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/status",
  authorize("admin"),
  validateId,
  async (req, res, next) => {
    try {
      const order = await orderService.updateOrderStatus(
        req.params.id,
        req.body.status,
      );
      res.json({
        success: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", validateId, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (order.userId !== req.user.userId && req.user.role !== "admin") {
      return next(new AppError("Insufficient permissions", 403));
    }
    await orderService.cancelOrder(req.params.id);
    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
