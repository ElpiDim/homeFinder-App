const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const verifyToken = require("../middlewares/authMiddleware");

// OWNER proposes slots (creates appointment)
router.post("/propose", verifyToken, appointmentController.proposeAppointmentSlots);

// TENANT confirms a selected slot
router.put("/confirm/:appointmentId", verifyToken, appointmentController.confirmAppointmentSlot);

// OWNER views their appointments
router.get("/owner", verifyToken, appointmentController.getAppointmentsByOwner);

// TENANT views their appointments
router.get("/tenant", verifyToken, appointmentController.getAppointmentsByTenant);

// Update appointment status (cancel/reject)
router.patch("/:appointmentId", verifyToken, appointmentController.updateAppointmentStatus);

// OWNER or TENANT can change an appointment time
router.patch("/:appointmentId/reschedule", verifyToken, appointmentController.rescheduleAppointment);

// OWNER or TENANT can delete appointment
router.delete("/:appointmentId", verifyToken, appointmentController.deleteAppointment);

// Fetch single appointment by ID (for modal)
router.get("/:appointmentId", verifyToken, appointmentController.getAppointmentById);

module.exports = router;
