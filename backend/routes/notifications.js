const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notificationController");

// All routes protected
router.get("/", verifyToken, notificationController.getNotifications);
router.patch("/:id/read", verifyToken, notificationController.markAsRead);
router.delete("/:id", verifyToken, notificationController.deleteNotification);

module.exports = router;
