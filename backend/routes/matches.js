const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const matchController = require("../controllers/matchController");

router.get("/owner/pending", verifyToken, matchController.getOwnerPendingMatches);
router.patch("/:matchId/status", verifyToken, matchController.updateMatchStatus);
router.get("/client/accepted", verifyToken, matchController.getClientAcceptedMatches);
router.post("/run", verifyToken, matchController.runClientMatching);

module.exports = router;
