const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const verifyToken = require("../middlewares/authMiddleware");

//  Tenant submits new interest
router.post("/", verifyToken, interestController.submitInterest);

// Tenant: Get all their interests
router.get("/", verifyToken, interestController.getInterests);

//  Owner: Get single interest by ID (για modal)
router.get("/:id", verifyToken, interestController.getInterestById);

//  Owner: Update status + preferredDate
router.put("/:interestId", verifyToken, interestController.updateInterestStatus);

module.exports = router;