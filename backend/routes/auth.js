const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const router = express.Router();
const User = require("../models/user");
const { buildUserResponse } = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
require("dotenv").config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    const ip = ipKeyGenerator(req);
    return email ? `login:${email}|${ip}` : `login:${ip}`;
  },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password change attempts. Try again later." },
  keyGenerator: (req) => {
    const userId = req.user?.userId || "anonymous";
    const ip = ipKeyGenerator(req);
    return `change-password:${userId}|${ip}`;
  },
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many Google auth attempts. Try again later." },
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    return `google-auth:${ip}`;
  },
});

/* ----------------------- Helpers ----------------------- */

const signAppToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

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
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role,
      onboardingCompleted: role === "owner",
    });

    const token = signAppToken(newUser);

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
    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
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

    const token = signAppToken(user);

    res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/google
// @desc    Register/Login with Google
// @access  Public
router.post("/google", googleAuthLimiter, async (req, res) => {
  const { credential, role } = req.body;

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ message: "Google OAuth is not configured on the server." });
  }

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleId = payload?.sub;
    const email = payload?.email?.toLowerCase().trim();
    const emailVerified = payload?.email_verified;
    const name = payload?.name || "";
    const picture = payload?.picture || "";

    if (!googleId || !email) {
      return res.status(400).json({ message: "Invalid Google account data." });
    }

    if (!emailVerified) {
      return res.status(400).json({ message: "Google email is not verified." });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    // Existing user → login
    if (user) {
      let didChange = false;

      if (!user.googleId) {
        user.googleId = googleId;
        didChange = true;
      }

      if (!user.name && name) {
        user.name = name;
        didChange = true;
      }

      if (!user.profilePicture && picture) {
        user.profilePicture = picture;
        didChange = true;
      }

      if (didChange) {
        await user.save();
      }

      const token = signAppToken(user);

      return res.json({
        token,
        user: buildUserResponse(user),
      });
    }

    // New user → requires role from register page
    if (!role || !["client", "owner"].includes(role)) {
      return res.status(400).json({
        message: "Please select whether you are a Client or Owner first.",
      });
    }

    user = await User.create({
      email,
      name,
      profilePicture: picture,
      googleId,
      role,
      password: await bcrypt.hash(googleId + process.env.JWT_SECRET, 10),
      onboardingCompleted: role === "owner",
    });

    const token = signAppToken(user);

    return res.status(201).json({
      token,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("google auth error:", err);
    return res.status(500).json({ message: "Google authentication failed." });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change authenticated user's password
// @access  Private
router.post("/change-password", verifyToken, changePasswordLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from current password." });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("change-password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;