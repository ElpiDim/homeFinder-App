const express = require("express");
const verifyToken = require("../middlewares/authMiddleware");
const controller = require("../controllers/matchCandidateController");

const router = express.Router();

router.get("/owner", verifyToken, controller.getOwnerCandidates);
router.patch("/:id/approve", verifyToken, controller.approveCandidate);
router.patch("/:id/reject", verifyToken, controller.rejectCandidate);

module.exports = router;
