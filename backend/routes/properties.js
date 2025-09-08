const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const { uploadImages } = require("../middlewares/uploadMiddleware");
const propertyController = require("../controllers/propertyController");
const matchController = require("../controllers/matchController");
const Property = require("../models/property");
const optionalAuth = require("../middlewares/optionalAuth");

// Find matching properties for a user
router.get("/matches/:userId", verifyToken, matchController.findMatchingProperties);

// get all (public, αλλά αν έχει token κάνει και filtering)
router.get("/", optionalAuth, propertyController.getAllProperties);

// get my properties
router.get("/mine", verifyToken, propertyController.getMyProperties);

// create property
router.post("/", verifyToken, uploadImages, propertyController.createProperty);

// get by id (🔑 προσθέσαμε optionalAuth εδώ)
router.get("/:propertyId", optionalAuth, propertyController.getPropertyById);

// delete property
router.delete("/:propertyId", verifyToken, propertyController.deleteProperty);

// edit property
router.put("/:propertyId", verifyToken, uploadImages, propertyController.updateProperty);

module.exports = router;
