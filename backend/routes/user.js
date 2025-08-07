const express = require("express");
const router = express.Router();

// Controllers
const userController = require("../controllers/userController");

// Middlewares
const verifyToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// Register
router.post("/register", userController.registerUser);

// Login
router.post("/login", userController.loginUser);

// Get profile
router.get("/profile", verifyToken, userController.getUserProfile);

// Update profile
router.put(
  "/profile",
  verifyToken,
  upload.single("profilePicture"),
  userController.updateUserProfile
);

// Delete profile
router.delete("/profile", verifyToken, userController.deleteUserAccount);

module.exports = router;

