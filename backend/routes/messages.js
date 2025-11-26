const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/", verifyToken, messageController.sendMessage);
router.get("/", verifyToken, messageController.getMessagesForUser);
router.get("/conversations", verifyToken, messageController.getConversations);
router.patch(
  "/conversation/:propertyId/:otherUserId/read",
  verifyToken,
  messageController.markConversationAsRead
);

module.exports = router;
