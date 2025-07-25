const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/", verifyToken, appointmentController.requestAppointment);
router.get("/tenant/:tenantId", verifyToken, appointmentController.getAppointmentsByTenant);
router.patch("/:appointmentId", appointmentController.updateAppointmentStatus);

module.exports = router;
