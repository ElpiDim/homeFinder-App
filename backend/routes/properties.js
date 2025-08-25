const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/authOptional"); // 👈
const { uploadImages } = require("../middlewares/uploadMiddleware");

const propertyController = require("../controllers/propertyController");

// GET /properties  -> public + eligibility αν υπάρχει client JWT
router.get("/", optionalAuth, propertyController.getAllProperties);

// GET /properties/mine -> μόνο owners
router.get("/mine", verifyToken, propertyController.getMyProperties);

// POST /properties -> μόνο owners
router.post("/", verifyToken, uploadImages, propertyController.createProperty);

// GET /properties/:propertyId -> public
// (προαιρετικά μπορείς να κάνεις eligibility guard μέσα στον controller)
router.get("/:propertyId", optionalAuth, propertyController.getPropertyById);

// DELETE /properties/:propertyId -> μόνο owners (του συγκεκριμένου property)
router.delete("/:propertyId", verifyToken, propertyController.deleteProperty);

// PUT /properties/:propertyId -> μόνο owners (του συγκεκριμένου property)
router.put("/:propertyId", verifyToken, uploadImages, propertyController.updateProperty);

module.exports = router;
