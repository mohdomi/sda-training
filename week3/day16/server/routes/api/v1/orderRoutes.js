const express = require("express");
const router = express.Router();
const orderService = require("../../../services/orderService");
const { authenticate, authorize } = require("../../../middleware/auth");
const { AppError } = require("../../../middleware/errorHandler");
const {
  validateOrder,
  validateUuid,
  validatePagination,
} = require("../../../middleware/validation");

// Orders live in PostgreSQL (UUID ids). Users live in MongoDB, so the owner
// key is the Mongo ObjectId string stored in orders.user_id (TEXT).
// authenticate() sets req.user to the Mongoose doc (has _id).
const requestUserId = (req) =>
  req.user._id ? String(req.user._id) : String(req.user.userId);

router.use(authenticate);

router.post("/", validateOrder, async (req, res, next) => {
  try {
    const order = await orderService.createOrder({
      ...req.body,
      userId: requestUserId(req),
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
    const orders = await orderService.getOrdersByUser(requestUserId(req));
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

router.get("/:id", validateUuid, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (order.userId !== requestUserId(req) && req.user.role !== "admin") {
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
  validateUuid,
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

router.delete("/:id", validateUuid, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (order.userId !== requestUserId(req) && req.user.role !== "admin") {
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
