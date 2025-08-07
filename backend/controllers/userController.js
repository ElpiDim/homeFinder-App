const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// register new user 
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, occupation, salary } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already used" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
      occupation,
      salary,
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
};

// login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const payload = {
      userId: user._id,
      role: user.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    // 🔁 Επιστρέφουμε όλα τα χρήσιμα στοιχεία χρήστη
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        occupation: user.occupation,
        salary: user.salary,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// get user profile 
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// update user profile
exports.updateUserProfile = async (req, res) => {
  const userId = req.user.userId;
  const { name, phone, address, occupation, salary } = req.body;

  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  const updateData = {
    name,
    phone,
    address,
    occupation,
    salary,
  };

  if (req.file) {
    const profileUrl = `/uploads/${req.file.filename}`;
    updateData.profilePicture = profileUrl;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    res.json({ user: updatedUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/user/profile
exports.deleteUserAccount = async (req, res) => {
  try {
    console.log('🔐 Received DELETE request');

    console.log('👉 req.user:', req.user); // Πρέπει να δεις userId

    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId in token" });
    }

    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      return res.status(404).json({ message: "User not found or already deleted" });
    }

    console.log('✅ User deleted:', result.email);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
