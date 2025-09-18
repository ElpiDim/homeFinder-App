// backend/routes/properties.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuth");

// uploads: images[] + floorPlanImage (multer fields)
const { uploadFields } = require("../middlewares/uploadMiddleware");

const propertyController = require("../controllers/propertyController");

// ------------------------------------------------------------------
// Public listing (optional auth: αν υπάρχει token, γεμίζει req.currentUser
// ώστε να δουλέψει το client matching στον controller)
router.get("/", optionalAuth, propertyController.getAllProperties);

// Owner: τα properties μου (+stats με ?includeStats=1)
router.get("/mine", verifyToken, propertyController.getMyProperties);

// Create (owner + uploads)
router.post("/", verifyToken, uploadFields, propertyController.createProperty);

// Public: get by id (optional auth για μελλοντικούς κανόνες/visibility)
router.get("/:propertyId", optionalAuth, propertyController.getPropertyById);

// Update (owner + uploads) — full update (PUT) ή partial (PATCH)
router.put("/:propertyId", verifyToken, uploadFields, propertyController.updateProperty);
router.patch("/:propertyId", verifyToken, uploadFields, propertyController.updateProperty);

// Delete (owner)
router.delete("/:propertyId", verifyToken, propertyController.deleteProperty);

module.exports = router;
