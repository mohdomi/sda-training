const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");

class NotificationService extends EventEmitter {
  constructor() {
    super();

    this.notifications = new Map();
  }

  async initialize() {
    console.log("NotificationService initialized");
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on("notification:sent", (notification) => {
      console.log(`Notification sent : ${notification.userId}`);
    });

    this.on("notification:read", (notificationId) => {
      console.log(`Notification read : ${notificationId}`);
    });

    this.on("notification:deleted", (notificationId) => {
      console.log(`Notification deleted : ${notificationId}`);
    });
  }

  async sendNotification(notificationData) {
    try {
      const { userId, type, message, title } = notificationData;

      if (!userId || !type || !message) {
        throw new Error("Missing required fields");
      }

      const notification = {
        id: uuidv4(),
        userId,
        type,
        title: title || type,
        message,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.notifications.set(notification.id, notification);

      this.emit("notification:sent", notification);

      return {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      };
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  async getNotificationById(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async markAsRead(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    notification.isRead = true;
    notification.updatedAt = new Date();
    this.notifications.set(notification.id, notification);

    this.emit("notification:read", notificationId);

    return {
      id: notification.id,
      isRead: notification.isRead,
      updatedAt: notification.updatedAt,
    };
  }

  async deleteNotification(notificationId) {
    const notification = this.notifications.get(notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    this.notifications.delete(notificationId);

    this.emit("notification:deleted", notificationId);

    return {
      message: "Notification deleted successfully",
    };
  }

  async getNotificationsByUser(userId) {
    const notifications = Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId
    );

    return notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((notification) => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      }));
  }

  async getAllNotifications(filters = {}) {
    let notifications = Array.from(this.notifications.values());

    if (filters.userId) {
      notifications = notifications.filter((n) => n.userId === filters.userId);
    }

    if (filters.type) {
      notifications = notifications.filter((n) => n.type === filters.type);
    }

    if (filters.isRead !== undefined) {
      notifications = notifications.filter((n) => n.isRead === filters.isRead);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const total = notifications.length;
    const paginatedNotifications = notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .map((notification) => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      }));

    return {
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new NotificationService();
