const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/", verifyToken, interestController.submitInterest);
router.get("/tenant/:tenantId", verifyToken, interestController.getInterests);
router.patch("/:interestId", interestController.updateInterestStatus);

module.exports = router;
