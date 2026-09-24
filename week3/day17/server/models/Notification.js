const mongoose = require("mongoose");

// Notifications live in MongoDB (document-shaped, per-user).
// userId stores the Mongo ObjectId string of the owner (no populate —
// users and notifications share the same DB but stay loosely coupled).
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: [true, "userId is required"], index: true },
    type: { type: String, required: [true, "Type is required"], trim: true, maxlength: 50 },
    title: { type: String, trim: true, maxlength: 100, default: null },
    message: { type: String, required: [true, "Message is required"], trim: true, maxlength: 500 },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
