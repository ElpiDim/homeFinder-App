// routes/user.js
const router = require("express").Router();
const verifyToken = require("../middlewares/authMiddleware");
const User = require("../models/user");

// GET /api/users/me
router.get("/me", verifyToken, async (req, res) => {
  const u = await User.findById(req.user.userId).select("-password");
  if (!u) return res.status(404).json({ message: "User not found" });
  res.json(u);
});

// PUT /api/users/me  (update personal profile fields)
router.put("/me", verifyToken, async (req, res) => {
  const b = req.body || {};
  const up = {};
  if (b.age !== undefined) up.age = parseInt(b.age);
  if (b.householdSize !== undefined) up.householdSize = parseInt(b.householdSize);
  if (b.hasFamily !== undefined) up.hasFamily = b.hasFamily === true || b.hasFamily === "true";
  if (b.hasPets !== undefined) up.hasPets = b.hasPets === true || b.hasPets === "true";
  if (b.smoker !== undefined) up.smoker = b.smoker === true || b.smoker === "true";
  if (b.isWillingToHaveRoommate !== undefined) up.isWillingToHaveRoommate =
      b.isWillingToHaveRoommate === true || b.isWillingToHaveRoommate === "true";
  if (b.occupation !== undefined) up.occupation = b.occupation;
  if (b.salary !== undefined) up.salary = parseFloat(b.salary);

  const user = await User.findByIdAndUpdate(req.user.userId, up, { new: true }).select("-password");
  res.json(user);
});

// PUT /api/users/me/preferences
router.put("/me/preferences", verifyToken, async (req, res) => {
  const b = req.body || {};
  const up = {
    "preferences.type": b.type,
    "preferences.location": b.location,
    "preferences.minPrice": b.minPrice,
    "preferences.maxPrice": b.maxPrice,
    "preferences.minSqm": b.minSqm,
    "preferences.maxSqm": b.maxSqm,
    "preferences.bedrooms": b.bedrooms,
    "preferences.bathrooms": b.bathrooms,
    "preferences.petsAllowed": b.petsAllowed,
    "preferences.smokingAllowed": b.smokingAllowed,
    "preferences.furnished": b.furnished,
  };

  if (b.completeOnboarding) {
    up.hasCompletedOnboarding = true;
  }

  const user = await User.findByIdAndUpdate(req.user.userId, up, { new: true }).select("-password");
  res.json({ ok: true, user });
});

module.exports = router;
