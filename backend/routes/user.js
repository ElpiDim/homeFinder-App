const express = require("express");
const router = express.Router();
const User = require("../models/user");
const userController = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
const {updateUserProfile} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
//register 
router.post("/register", userController.registerUser);

//login
router.post("/login", userController.loginUser);

//get profile
router.get("/profile", verifyToken, userController.getUserProfile);

//update profile
router.put("/profile", verifyToken, upload.single("profilePicture"), userController.updateUserProfile);
//router.post('/favorites/:propertyId', verifyToken, userController.toggleFavorite);


module.exports = router;