// routes/interests.js
const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const verifyToken = require("../middlewares/authMiddleware");

// tenant
router.post("/", verifyToken, interestController.submitInterest);
router.get("/", verifyToken, interestController.getInterests);

// owner/tenant
router.get("/:id", verifyToken, interestController.getInterestById);

// 🔧 owner: update status/preferredDate
router.patch("/:id/status", verifyToken, interestController.updateInterestStatus);

module.exports = router;
