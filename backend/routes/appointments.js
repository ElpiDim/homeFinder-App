const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const verifyToken = require("../middlewares/authMiddleware");

// OWNER proposes slots (creates appointment)
router.post("/propose", verifyToken, appointmentController.proposeAppointmentSlots);

// OWNER views their appointments
router.get("/owner", verifyToken, appointmentController.getAppointmentsByOwner);

// TENANT views their appointments
router.get("/tenant", verifyToken, appointmentController.getAppointmentsByTenant);

// TENANT accepts a slot (primary route)
router.patch(
  "/:appointmentId/accept",
  verifyToken,
  appointmentController.acceptAppointmentSlot
);

// Either party declines
router.patch(
  "/:appointmentId/decline",
  verifyToken,
  appointmentController.declineAppointment
);

// Either party cancels
router.patch(
  "/:appointmentId/cancel",
  verifyToken,
  appointmentController.cancelAppointment
);

// Legacy confirm route kept for backward-compatibility
router.put(
  "/confirm/:appointmentId",
  verifyToken,
  appointmentController.acceptAppointmentSlot
);

// Legacy status update route (supports cancelled/declined)
router.patch(
  "/:appointmentId",
  verifyToken,
  appointmentController.updateAppointmentStatus
);

// Fetch single appointment by ID (for modal)
router.get("/:appointmentId", verifyToken, appointmentController.getAppointmentById);

module.exports = router;
