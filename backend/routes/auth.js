const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const router = express.Router();
const User = require("../models/user");
const { buildUserResponse } = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
require("dotenv").config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ----------------------- Mailer ----------------------- */

const mailerConfigured =
  process.env.MAIL_HOST &&
  process.env.MAIL_PORT &&
  process.env.MAIL_USER &&
  process.env.MAIL_PASS;

const transporter = mailerConfigured
  ? nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    })
  : null;

/* ----------------------- Rate Limiters ----------------------- */

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registrations from this IP. Try again later." },
});

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
});

const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Try again later." },
  keyGenerator: (req) => {
    const email = (req.body?.email || "").toString().trim().toLowerCase();
    const ip = ipKeyGenerator(req);
    return email ? `forgot:${email}|${ip}` : `forgot:${ip}`;
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reset attempts. Try again later." },
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    return `reset-password:${ip}`;
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

/* ----------------------- Forgot / Reset Password ----------------------- */

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const email = (req.body?.email || "").toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });

    // Always return same response for privacy
    const genericResponse = {
      message: "If an account with that email exists, a reset link has been sent.",
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    if (!transporter) {
      console.error("Forgot password attempted but mailer is not configured.");
      return res.status(500).json({ message: "Email service is not configured." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendBase =
      process.env.FRONTEND_URL ||
      process.env.FRONTEND_URL_STAGE ||
      "http://localhost:3000";

    const resetUrl = `${frontendBase.replace(/\/+$/, "")}/reset-password/${rawToken}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: user.email,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your password</h2>
          <p>You requested a password reset for your account.</p>
          <p>Click the button below to set a new password:</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#7f13ec;color:#fff;text-decoration:none;border-radius:8px;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("forgot-password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

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