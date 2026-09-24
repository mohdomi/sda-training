const EventEmitter = require("events");
const Notification = require("../models/Notification");

// MongoDB-backed NotificationService. Same public method names as before
// so routes and the frontend don't change.
class NotificationService extends EventEmitter {
  async initialize() {
    console.log("NotificationService initialized (mongo)");
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on("notification:sent", (n) => {
      console.log(`Notification sent : ${n.userId}`);
    });
    this.on("notification:read", (id) => {
      console.log(`Notification read : ${id}`);
    });
    this.on("notification:deleted", (id) => {
      console.log(`Notification deleted : ${id}`);
    });
  }

  serialize(doc) {
    if (!doc) return null;
    return {
      id: doc._id,
      _id: doc._id,
      userId: doc.userId,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      isRead: doc.isRead,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async sendNotification({ userId, type, message, title }) {
    if (!userId || !type || !message) throw new Error("Missing required fields");
    const doc = new Notification({
      userId: String(userId),
      type,
      title: title || type,
      message,
    });
    await doc.save();
    const out = this.serialize(doc);
    this.emit("notification:sent", out);
    return out;
  }

  async getNotificationById(id) {
    const doc = await Notification.findById(id);
    if (!doc) throw new Error("Notification not found");
    return this.serialize(doc);
  }

  async markAsRead(id) {
    const doc = await Notification.findById(id);
    if (!doc) throw new Error("Notification not found");
    doc.isRead = true;
    await doc.save();
    this.emit("notification:read", String(doc._id));
    return { id: doc._id, isRead: doc.isRead, updatedAt: doc.updatedAt };
  }

  async deleteNotification(id) {
    const doc = await Notification.findByIdAndDelete(id);
    if (!doc) throw new Error("Notification not found");
    this.emit("notification:deleted", String(doc._id));
    return { message: "Notification deleted successfully" };
  }

  async getNotificationsByUser(userId) {
    const docs = await Notification.find({ userId: String(userId) }).sort({ createdAt: -1 });
    return docs.map((d) => this.serialize(d));
  }

  async getAllNotifications(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = String(filters.userId);
    if (filters.type) q.type = filters.type;
    if (filters.isRead !== undefined) {
      q.isRead = filters.isRead === true || filters.isRead === "true";
    }
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const total = await Notification.countDocuments(q);
    const docs = await Notification.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return {
      notifications: docs.map((d) => this.serialize(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = new NotificationService();
