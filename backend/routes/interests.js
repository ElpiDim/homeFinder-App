// routes/interests.js
const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
// Σημείωση: κρατάω τον ίδιο τρόπο import που ήδη χρησιμοποιείς
// (default export από ../middlewares/authMiddleware)
const verifyToken = require("../middlewares/authMiddleware");

/**
 * Tenant submits new interest
 * POST /interests
 */
router.post("/", verifyToken, interestController.submitInterest);

/**
 * Tenant: Get all their interests
 * GET /interests
 */
router.get("/", verifyToken, interestController.getInterests);

/**
 * Owner/Tenant: Get single interest by ID (e.g., for modal)
 * GET /interests/:id
 */
router.get("/:id", verifyToken, interestController.getInterestById);

/**
 * Owner: Update interest status (accepted | rejected) and optional fields (e.g., preferredDate)
 * PATCH /interests/:id/status
 */
router.patch("/:id/status", verifyToken, interestController.updateInterestStatus);

module.exports = router;
