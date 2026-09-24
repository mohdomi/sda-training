const express = require("express");
const router = express.Router();
const notificationService = require("../../../services/notificationService");
const { authMiddleware } = require("../../../middleware/auth");
const { AppError } = require("../../../middleware/errorHandler");
const {
  validateNotification,
  validateId,
  validatePagination,
} = require("../../../middleware/validation");

router.use(authMiddleware);

router.post("/", validateNotification, async (req, res, next) => {
  try {
    const notification = await notificationService.sendNotification({
      ...req.body,
      userId: req.body.userId || req.user.userId,
    });
    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/my", async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotificationsByUser(
      req.user.userId,
    );
    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", validatePagination, async (req, res, next) => {
  try {
    const result = await notificationService.getAllNotifications({
      ...req.query,
      userId: req.user.role === "admin" ? req.query.userId : req.user.userId,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", validateId, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(
      req.params.id,
    );
    if (
      notification.userId !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return next(new AppError("Insufficient permissions", 403));
    }
    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", validateId, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(
      req.params.id,
    );
    if (
      notification.userId !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return next(new AppError("Insufficient permissions", 403));
    }
    const result = await notificationService.markAsRead(req.params.id);
    res.json({
      success: true,
      message: "Notification marked as read",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", validateId, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(
      req.params.id,
    );
    if (
      notification.userId !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return next(new AppError("Insufficient permissions", 403));
    }
    await notificationService.deleteNotification(req.params.id);
    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
