const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/", verifyToken, messageController.sendMessage);
router.get("/", verifyToken, messageController.getMessagesForUser);

module.exports = router;
