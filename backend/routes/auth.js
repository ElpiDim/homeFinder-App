const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
 const router = express.Router();

const User = require("../models/user");
require("dotenv").config();
 
 // @route   POST /api/auth/register
 // @desc    Register new user
 // @access  Public
router.post("/register", async (req, res) => {
  const { email, password,role } = req.body;
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   if (!email || !password) {
    return res.status(400).json({ message: "please fill all required fields" });
  }
 
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }
 
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }
 
  try {
     const existingUser = await User.findOne({ email });
     if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
     }
 
     const hashedPassword = await bcrypt.hash(password, 10);
 
    const newUser = await User.create({
       email,
       password: hashedPassword,
       role, 
     });
 
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        hasCompletedOnboarding: newUser.hasCompletedOnboarding,
      },
    });
   } catch (err) {
     console.error(err);

    res.status(500).json({ message: "Server error" });
   }
 });
 
 // @route   POST /api/auth/login
 // @desc    Authenticate user & get token
 // @access  Public
 router.post("/login", async (req, res) => {
   const { email, password, role, occupation, salary } = req.body;
 
   try {
     const user = await User.findOne({ email });
     if (!user) {
       return res.status(400).json({ message: "Invalid email or password" });
     }
 
     const isMatch = await bcrypt.compare(password, user.password);
     if (!isMatch) {
       return res.status(400).json({ message: "Invalid email or password" });
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
       user: {
         id: user._id,
         name: user.name,
         email: user.email,
         role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        age: user.age,
        householdSize: user.householdSize,
        hasFamily: user.hasFamily,
        hasPets: user.hasPets,
        smoker: user.smoker,
         occupation: user.occupation,
         salary: user.salary,

        isWillingToHaveRoommate: user.isWillingToHaveRoommate,
        profilePicture: user.profilePicture,
        preferences: user.preferences,
      },
     });

   } catch (err) {
     console.error(err);
     res.status(500).json({ message: "Server error" });
   }
 });
 
 module.exports = router;
