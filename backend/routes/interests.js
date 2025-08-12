// routes/interests.js
const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const verifyToken = require("../middlewares/authMiddleware");

// Tenant: submit new interest
router.post("/", verifyToken, interestController.submitInterest);

// Tenant: list own interests
router.get("/", verifyToken, interestController.getInterests);

// Get single interest (owner uses this for the modal too)
router.get("/:id", verifyToken, interestController.getInterestById);

// Owner: update status (accepted | rejected | pending) + optional preferredDate
router.patch("/:id/status", verifyToken, interestController.updateInterestStatus);

module.exports = router;
