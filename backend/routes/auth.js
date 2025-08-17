const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  try {
    const { name, email, password, role, phone, address, occupation, salary } = req.body;

    // Έλεγχος για κενά
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "please fill all required fields" });
    }

    // Έλεγχος για email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Έλεγχος μήκους κωδικού
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the user
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
    res.status(201).json({ message: 'User registered successfully ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error ' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Βρες τον χρήστη με βάση το email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Σύγκρινε τους κωδικούς
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Φτιάξε το JWT token
    const payload = {
      userId: user._id,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const profilePicture = user.profilePicture
      ? `${baseUrl}${user.profilePicture}`
      : null;

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
        profilePicture,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
