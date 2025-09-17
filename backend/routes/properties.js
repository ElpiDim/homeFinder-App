// backend/routes/properties.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuth");

// ⬇︎ χρησιμοποιούμε fields (images + floorPlanImage)
const { uploadFields } = require("../middlewares/uploadMiddleware");

const propertyController = require("../controllers/propertyController");

// GET all (public; αν υπάρχει token το optionalAuth γεμίζει req.currentUser για matching)
router.get("/", optionalAuth, propertyController.getAllProperties);

// GET my properties (owner only)
router.get("/mine", verifyToken, propertyController.getMyProperties);

// CREATE property (owner + uploads)
router.post("/", verifyToken, uploadFields, propertyController.createProperty);

// GET by id (public με optionalAuth για client rules αν χρειαστεί)
router.get("/:propertyId", optionalAuth, propertyController.getPropertyById);

// DELETE property (owner)
router.delete("/:propertyId", verifyToken, propertyController.deleteProperty);

// UPDATE property (owner + uploads)
router.put("/:propertyId", verifyToken, uploadFields, propertyController.updateProperty);

module.exports = router;
