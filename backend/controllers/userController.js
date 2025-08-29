const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* -------------------------- helpers -------------------------- */
const buildBaseUrl = () => process.env.BASE_URL || "http://localhost:5000";

const buildUserResponse = (userDoc) => {
  const baseUrl = buildBaseUrl();
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;

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
    profilePicture: user.profilePicture ? `${baseUrl}${user.profilePicture}` : null,

    // nested
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
    console.error(err);
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

    // Επιστρέφουμε ασφαλή & πλήρη εικόνα του χρήστη
    const safe = buildUserResponse(user);

    res.json({ token, user: safe });
  } catch (err) {
    console.error("Login error:", err);
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

  const updateData = { name, phone, occupation, salary };

  if (req.file) {
    updateData.profilePicture = `/uploads/${req.file.filename}`;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ user: buildUserResponse(updatedUser) });
  } catch (err) {
    console.error("Update profile error:", err);
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
    const allowedUpdates = [
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
      "preferences",
      "requirements",
      "onboardingCompleted", // FIX: αντί για hasCompletedOnboarding
      "profilePicture", // σε περίπτωση που στέλνεις direct string
    ];

    const updateData = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // file upload path
    if (req.file) {
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(buildUserResponse(updatedUser));
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

    const {
      // profile
      name, phone, age, householdSize, hasFamily, hasPets, smoker, occupation, salary, isWillingToHaveRoommate,
      // preferences + requirements έρχονται ως nested objects (καλύτερα έτσι)
      preferences,
      requirements,
    } = req.body;

    // καθάρισμα undefined
    const deepClean = (obj) =>
      Object.fromEntries(
        Object.entries(obj)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? deepClean(v) : v])
      );

    const update = deepClean({
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
      preferences,
      requirements,
      onboardingCompleted: true,
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ message: "Onboarding saved", user: buildUserResponse(updatedUser) });
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
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
