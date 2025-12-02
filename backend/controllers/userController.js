// controllers/userController.js
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* -------------------------- helpers -------------------------- */
const buildBaseUrl = () => process.env.BASE_URL || "http://localhost:5000";

/**
 * Επιστρέφει ασφαλές user payload με ενεργοποιημένα virtuals (π.χ. preferences.priceMin/Max).
 */
const buildUserResponse = (userDoc) => {
  const baseUrl = buildBaseUrl();
  const user = userDoc?.toObject ? userDoc.toObject({ virtuals: true }) : userDoc;

  const makeAbs = (p) => {
    if (!p) return null;
    // αν ήδη είναι absolute (http/https), κράτα το
    if (/^https?:\/\//i.test(p)) return p;
    return `${baseUrl}${p}`;
  };

  return {
    id: user._id,
    name: user.name || null,
    email: user.email,
    role: user.role,
    phone: user.phone || null,

    // δημογραφικά / lifestyle
    age: user.age ?? null,
    householdSize: user.householdSize ?? null,
    hasFamily: user.hasFamily ?? false,
    hasPets: user.hasPets ?? false,
    smoker: user.smoker ?? false,
    occupation: user.occupation || null,
    salary: user.salary ?? null,
    isWillingToHaveRoommate: user.isWillingToHaveRoommate ?? false,

    // flags
    onboardingCompleted: user.onboardingCompleted || false,

    // media
    profilePicture: makeAbs(user.profilePicture),

    // nested (με virtuals)
    preferences: user.preferences || {},
    requirements: user.requirements || {},

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/* -------------------------- register ------------------------- */
// POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password and role are required" });
    }
    if (!["client", "owner"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already used" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, role });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("registerUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------- login -------------------------- */
// POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const payload = { userId: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    const safe = buildUserResponse(user);
    res.json({ token, user: safe });
  } catch (err) {
    console.error("loginUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------------- get profile ----------------------- */
// GET /api/users/me (ή /api/users/profile)
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(buildUserResponse(user));
  } catch (err) {
    console.error("getUserProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------- update basic profile ----------------- */
// PATCH /api/users/profile (με multipart για φωτο, αν υπάρχει middleware)
exports.updateUserProfile = async (req, res) => {
  const userId = req.user.userId;
  const { name, phone, occupation, salary } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (occupation !== undefined) updateData.occupation = occupation;
  if (salary !== undefined) updateData.salary = salary;

  if (req.file) {
    updateData.profilePicture = `/uploads/${req.file.filename}`;
  }

  try {
    // top-level only, δεν χρειάζονται virtual setters
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ user: buildUserResponse(updatedUser) });
  } catch (err) {
    console.error("updateUserProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------- get current user --------------------- */
// GET /api/users/me
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(buildUserResponse(user));
  } catch (err) {
    console.error("getCurrentUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------- update current user -------------------- */
// PUT /api/users/me  (συντηρητικό: μόνο απλά πεδία)
exports.updateCurrentUser = async (req, res) => {
  const userId = req.user.userId;
  const allowedFields = [
    "name",
    "phone",
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
    if (req.body[field] !== undefined) updateData[field] = req.body[field];
  });

  try {
    // top-level only, ok με findByIdAndUpdate
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(buildUserResponse(updatedUser));
  } catch (err) {
    console.error("updateCurrentUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------------ smart patch ------------------------ */
// PATCH /api/users/me  (πιο ελεύθερο: preferences/requirements & flag)
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user.userId; // FIX: ήταν req.user._id
    const doc = await User.findById(userId).select("-password");
    if (!doc) return res.status(404).json({ message: "User not found" });

    // Επιτρέπουμε συγκεκριμένα top-level πεδία
    const allowedTop = [
      "name",
      "phone",
      "occupation",
      "salary",
      "age",
      "householdSize",
      "hasFamily",
      "hasPets",
      "smoker",
      "isWillingToHaveRoommate",
      "onboardingCompleted",
      "profilePicture",
    ];
    for (const k of allowedTop) {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    }

    // file upload path
    if (req.file) {
      doc.profilePicture = `/uploads/${req.file.filename}`;
    }

    // Preferences: set πάνω στο subdoc για να ενεργοποιηθούν οι virtual setters
    if (req.body.preferences && typeof req.body.preferences === "object") {
      const p = req.body.preferences;
      Object.entries(p).forEach(([k, v]) => {
        if (v !== undefined) doc.preferences[k] = v; // π.χ. priceMin ⇒ virtual → saleMin
      });
    }

    // Requirements
    if (req.body.requirements && typeof req.body.requirements === "object") {
      const r = req.body.requirements;
      Object.entries(r).forEach(([k, v]) => {
        if (v !== undefined) doc.requirements[k] = v;
      });
    }

    await doc.save();
    res.json(buildUserResponse(doc));
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* --------------------- onboarding save ----------------------- */
// POST /api/users/onboarding
// Αποθηκεύει profile fields + preferences + requirements και θέτει onboardingCompleted=true
exports.saveOnboarding = async (req, res) => {
  try {
    const userId = req.user.userId;
    const doc = await User.findById(userId).select("-password");
    if (!doc) return res.status(404).json({ message: "User not found" });

    const {
      // profile
      name,
      phone,
      age,
      householdSize,
      hasFamily,
      hasPets,
      smoker,
      occupation,
      salary,
      isWillingToHaveRoommate,
      // nested
      preferences,
      requirements,
    } = req.body;

    // Top-level
    const assignIf = (k, v) => {
      if (v !== undefined) doc[k] = v;
    };
    assignIf("name", name);
    assignIf("phone", phone);
    assignIf("age", age);
    assignIf("householdSize", householdSize);
    assignIf("hasFamily", hasFamily);
    assignIf("hasPets", hasPets);
    assignIf("smoker", smoker);
    assignIf("occupation", occupation);
    assignIf("salary", salary);
    assignIf("isWillingToHaveRoommate", isWillingToHaveRoommate);

    // Preferences (virtual setters)
    if (preferences && typeof preferences === "object") {
      if (!doc.preferences) doc.preferences = {};
      Object.entries(preferences).forEach(([k, v]) => {
        if (v !== undefined) doc.preferences[k] = v;
      });
    }

    // Requirements
    if (requirements && typeof requirements === "object") {
      Object.entries(requirements).forEach(([k, v]) => {
        if (v !== undefined) doc.requirements[k] = v;
      });
    }

    // flag
    doc.onboardingCompleted = true;

    await doc.save();
    res.json({ message: "Onboarding saved", user: buildUserResponse(doc) });
  } catch (err) {
    console.error("saveOnboarding error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------- delete account ---------------------- */
// DELETE /api/users/profile
exports.deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId in token" });
    }

    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      return res.status(404).json({ message: "User not found or already deleted" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUserAccount error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ---------------------- get specific user -------------------- */
// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Χρησιμοποιούμε το υπάρχον helper για να κόψουμε ευαίσθητα data
    res.json(buildUserResponse(user));
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports.buildUserResponse = buildUserResponse;
