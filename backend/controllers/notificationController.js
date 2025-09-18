// controllers/notificationController.js
const Notification = require("../models/notification");

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user
 */
exports.getNotifications = async (req, res) => {
  const userId = req.user.userId;

  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate("senderId", "name");
    res.json(notifications);
  } catch (err) {
    console.error("❌ getNotifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 * - sets readAt (preferred) and read: true for backward-compat
 */
exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;

  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    console.error("❌ markAsRead error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification
 */
exports.deleteNotification = async (req, res) => {
  const notificationId = req.params.id;

  try {
    const deleted = await Notification.findByIdAndDelete(notificationId);
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("❌ deleteNotification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* Optional: Mark all as read
exports.markAllRead = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await Notification.updateMany(
      { userId, readAt: { $exists: false } },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: "All notifications marked as read", modified: result.modifiedCount });
  } catch (err) {
    console.error("❌ markAllRead error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
*/
