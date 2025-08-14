// routes/interests.js
const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const verifyToken = require("../middlewares/authMiddleware");

// Tenant submits new interest
router.post("/", verifyToken, interestController.submitInterest);

// Tenant: Get all their interests
router.get("/", verifyToken, interestController.getInterests);

// Owner: Get single interest by ID (for modal)
router.get("/:id", verifyToken, interestController.getInterestById);

// Owner: Update status + preferredDate
// supports both styles:
router.put("/:interestId", verifyToken, interestController.updateInterestStatus);
router.patch("/:id/status", verifyToken, interestController.updateInterestStatus);
router.put("/:id/status", verifyToken, interestController.updateInterestStatus);

module.exports = router;
