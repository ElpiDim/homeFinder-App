// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// POST /api/auth/register
// Minimal signup: name, email, password. Role defaults to "client".
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    // basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // password policy (simple)
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // uniqueness
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hash,
      role: "client",                // 👈 default
      hasCompletedOnboarding: false, // 👈 1η φορά θα πάει στο /profile
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        hasCompletedOnboarding: newUser.hasCompletedOnboarding,
      },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
// Returns JWT({ userId, role }) + user object (incl. hasCompletedOnboarding)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(String(password || ""), user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      console.warn("⚠️ JWT_SECRET is not set");
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "dev_secret_change_me",
      { expiresIn: "7d" } // πιο φιλικό για web sessions
    );

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const profilePicture = user.profilePicture ? `${baseUrl}${user.profilePicture}` : null;

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

        // προφίλ/χαρακτηριστικά (αν τα χρειάζεσαι άμεσα στο UI)
        phone: user.phone,
        address: user.address,
        occupation: user.occupation,
        salary: user.salary,
        age: user.age,
        householdSize: user.householdSize,
        hasFamily: user.hasFamily,
        hasPets: user.hasPets,
        smoker: user.smoker,
        isWillingToHaveRoommate: user.isWillingToHaveRoommate,

        // 👇 πολύ σημαντικό για το onboarding redirect
        hasCompletedOnboarding: !!user.hasCompletedOnboarding,

        // προτιμήσεις (προαιρετικό, χρήσιμο για default filters)
        preferences: user.preferences || null,

        profilePicture,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
