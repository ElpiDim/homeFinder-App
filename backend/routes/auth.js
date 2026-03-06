const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const router = express.Router();
const User = require("../models/user");
const { buildUserResponse } = require("../controllers/userController");
require("dotenv").config();

/* ----------------------- Rate Limiters ----------------------- */

// Register: αυστηρό ανά IP (anti-spam / bots)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registrations from this IP. Try again later." },
});

// Login: γενικό ανά IP (για πολλά διαφορετικά emails)
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 60, // 60 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
});

// Login: ανά account (email) + IP (brute-force protection per user)
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 8, // 8 attempts per 15 min per email|ip
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts for this account. Try again later." },
  keyGenerator: (req) => {
    const email = (req.body?.email || "").toString().trim().toLowerCase();
    const ip = ipKeyGenerator(req); // ✅ IPv6-safe key
    return email ? `login:${email}|${ip}` : `login:${ip}`;
  },
});

/* ----------------------- Routes ----------------------- */

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post("/register", registerLimiter, async (req, res) => {
  const { email, password, role } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !password) {
    return res.status(400).json({ message: "please fill all required fields" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      onboardingCompleted: role === "owner",
    });

    const payload = {
      userId: newUser._id,
      role: newUser.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      message: "User registered successfully",
      user: buildUserResponse(newUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", loginIpLimiter, loginAccountLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.role === "owner" && user.onboardingCompleted === false) {
      user.onboardingCompleted = true;
      await user.save();
    }

    const payload = {
      userId: user._id,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;