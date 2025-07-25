const Notification = require("../models/notification");

// GET - fetch all notifications for a user
exports.getNotifications = async (req, res) => {
  const userId = req.user.userId;

  try {
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH - mark notification as read
exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;

  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE - delete a notification
exports.deleteNotification = async (req, res) => {
  const notificationId = req.params.id;

  try {
    await Notification.findByIdAndDelete(notificationId);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
