const express = require("express");
const router = express.Router();

// Middlewares
const authMiddleware = require("../middlewares/authMiddleware");

// Controllers
const {
  getUserProfile,
  updateUserProfile,
  getCurrentUser,
  updateCurrentUser,
  updateMe,
  deleteUserAccount,
  saveOnboarding,
  getUserById,
} = require("../controllers/userController");

// -------------------- ROUTES --------------------

// GET /api/users/profile - full profile
router.get("/profile", authMiddleware, getUserProfile);

// PATCH /api/users/profile - update name/phone/occupation/salary (+ photo)
router.patch("/profile", authMiddleware, updateUserProfile);

// GET /api/users/me - current user (safe info, no password)
router.get("/me", authMiddleware, getCurrentUser);

// PUT /api/users/me - update simple personal fields
router.put("/me", authMiddleware, updateCurrentUser);

// PATCH /api/users/me - smart patch (preferences, requirements, onboardingCompleted κλπ)
router.patch("/me", authMiddleware, updateMe);

// POST /api/users/onboarding - first login onboarding form
router.post("/onboarding", authMiddleware, saveOnboarding);

// DELETE /api/users/profile - delete account
router.delete("/profile", authMiddleware, deleteUserAccount);

// GET /api/users/:id - View public profile of another user
router.get("/:id", authMiddleware, getUserById);
module.exports = router;
