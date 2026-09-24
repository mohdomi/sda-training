const express = require("express");
const router = express.Router();
const notificationService = require("../../../services/notificationService");
const { authenticate } = require("../../../middleware/auth");
const { AppError } = require("../../../middleware/errorHandler");
const {
  validateNotification,
  validateMongoId,
  validatePagination,
} = require("../../../middleware/validation");

// Notifications live in MongoDB (ObjectId ids). authenticate() sets req.user
// to the Mongoose doc. Deliberately NOT cached: default cache keys are per-path
// and would leak one user's notifications to another.
const requestUserId = (req) =>
  req.user._id ? String(req.user._id) : String(req.user.userId);

router.use(authenticate);

router.post("/", validateNotification, async (req, res, next) => {
  try {
    const notification = await notificationService.sendNotification({
      ...req.body,
      userId: req.body.userId || requestUserId(req),
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
    const notifications =
      await notificationService.getNotificationsByUser(requestUserId(req));
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

router.get("/", validatePagination, async (req, res, next) => {
  try {
    const result = await notificationService.getAllNotifications({
      ...req.query,
      userId: req.user.role === "admin" ? req.query.userId : requestUserId(req),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", validateMongoId, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id);
    if (notification.userId !== requestUserId(req) && req.user.role !== "admin") {
      return next(new AppError("Insufficient permissions", 403));
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", validateMongoId, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id);
    if (notification.userId !== requestUserId(req) && req.user.role !== "admin") {
      return next(new AppError("Insufficient permissions", 403));
    }
    const result = await notificationService.markAsRead(req.params.id);
    res.json({ success: true, message: "Notification marked as read", data: result });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", validateMongoId, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id);
    if (notification.userId !== requestUserId(req) && req.user.role !== "admin") {
      return next(new AppError("Insufficient permissions", 403));
    }
    await notificationService.deleteNotification(req.params.id);
    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
