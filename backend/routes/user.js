const express = require("express");
const router = express.Router();


// Middlewares
const verifyToken = require("../middlewares/authMiddleware");
// Models
const User = require("../models/user");

// GET /api/users/me - return current user without password
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/users/me - update personal fields
router.put("/me", verifyToken, async (req, res) => {
  const allowedFields = [
    "age",
    "householdSize",
    "hasFamily",
    "hasPets",
    "smoker",
    "occupation",
    "salary",
    "isWillingToHaveRoommate",
  ];

  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  try {
    const user = await User.findByIdAndUpdate(req.user.userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/users/me/preferences - update preference fields
router.put("/me/preferences", verifyToken, async (req, res) => {
  const prefFields = [
    "type",
    "location",
    "minPrice",
    "maxPrice",
    "minSqm",
    "maxSqm",
    "bedrooms",
    "bathrooms",
    "petsAllowed",
    "smokingAllowed",
    "furnished",
  ];

  const updateData = {};
  prefFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[`preferences.${field}`] = req.body[field];
    }
  });

  if (req.body.completeOnboarding === true) {
    updateData.hasCompletedOnboarding = true;
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;

