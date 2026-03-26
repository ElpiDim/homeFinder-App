const Appointment = require("../models/appointments");
const Notification = require("../models/notification");
const Property = require("../models/property");
const Message =require("../models/messages"); 

// OWNER proposes slots
exports.proposeAppointmentSlots = async (req, res) => {
  const { propertyId, tenantId, availableSlots } = req.body;
  const ownerId = req.user.userId;

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (String(property.ownerId) !== String(ownerId)) {
      return res
        .status(403)
        .json({ message: "Only the property owner can propose appointments" });
    }

    // 🔹 validation για τα slots
    if (!Array.isArray(availableSlots) || availableSlots.length === 0) {
      return res.status(400).json({
        message: "Please provide at least one appointment time.",
      });
    }

    const now = new Date();
    const normalizedSlots = availableSlots
      .map((slot) => new Date(slot))
      .filter((d) => !Number.isNaN(d.getTime()));

    const futureSlots = normalizedSlots.filter(
      (d) => d.getTime() >= now.getTime()
    );

    if (!futureSlots.length) {
      return res.status(400).json({
        message: "You cannot propose appointment times in the past.",
      });
    }

    const appointment = new Appointment({
      propertyId,
      tenantId,
      ownerId,
      availableSlots: futureSlots, // ✅ μόνο έγκυρα future slots
    });
    await appointment.save();

    await Notification.create({
      userId: tenantId,
      type: "appointment",
      referenceId: appointment._id,
      senderId: ownerId,
      message: "You have new appointment options from the property owner.",
    });

    res
      .status(201)
      .json({ message: "Appointment slots proposed", appointment });
  } catch (err) {
    console.error("❌ Error proposing appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reschedule an appointment (Tenant or Owner)
exports.rescheduleAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { availableSlots } = req.body;
  const userId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isOwner = appointment.ownerId.toString() === userId;
    const isTenant = appointment.tenantId.toString() === userId;

    if (!isOwner && !isTenant) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!Array.isArray(availableSlots) || availableSlots.length === 0) {
      return res.status(400).json({
        message: "Please provide at least one appointment time.",
      });
    }

    const now = new Date();
    const normalizedSlots = availableSlots
      .map((slot) => new Date(slot))
      .filter((d) => !Number.isNaN(d.getTime()));

    const futureSlots = normalizedSlots.filter(
      (d) => d.getTime() >= now.getTime()
    );

    if (!futureSlots.length) {
      return res.status(400).json({
        message: "You cannot propose appointment times in the past.",
      });
    }

    appointment.availableSlots = futureSlots;
    appointment.selectedSlot = undefined;
    appointment.status = "pending";
    await appointment.save();

    const recipientId = isOwner ? appointment.tenantId : appointment.ownerId;

    await Notification.create({
      userId: recipientId,
      type: "appointment",
      referenceId: appointment._id,
      senderId: userId,
      message: `The appointment has been rescheduled. New options are available.`,
    });

    res.json({ message: "Appointment rescheduled", appointment });
  } catch (err) {
    console.error("❌ Error rescheduling appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// TENANT confirms one slot
exports.confirmAppointmentSlot = async (req, res) => {
  const { appointmentId } = req.params;
  const { selectedSlot } = req.body;
  const userId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isOwner = appointment.ownerId.toString() === userId;
    const isTenant = appointment.tenantId.toString() === userId;

    if (!isOwner && !isTenant) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!selectedSlot) {
      return res.status(400).json({ message: "No slot selected" });
    }

    if (appointment.status === "confirmed") {
      return res.status(400).json({ message: "Appointment already confirmed" });
    }

    const slotDate = new Date(selectedSlot);
    const isValidSlot = appointment.availableSlots.some(
      (slot) => new Date(slot).getTime() === slotDate.getTime()
    );

    if (!isValidSlot) {
      return res.status(400).json({ message: "Selected slot is not one of the proposed options" });
    }

    appointment.selectedSlot = slotDate;
    appointment.status = "confirmed";
    await appointment.save();

    const humanReadable = slotDate.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle:"short",
    });

    const recipientId = isOwner ? appointment.tenantId : appointment.ownerId;

    await Notification.create({
      userId: recipientId,
      type: "appointment",
      referenceId: appointment._id,
      senderId: userId,
      message: `Appointment confirmed for ${humanReadable}.`,
    });
    res.json({ message: "Appointment confirmed", appointment });

    await Message.create({
      senderId: userId,
      receiverId: recipientId,
      propertyId: appointment.propertyId,
      content: `Appointment confirmed for ${humanReadable}.`,
    });
    
  } catch (err) {
    console.error("❌ Error confirming appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// TENANT views their appointments
exports.getAppointmentsByTenant = async (req, res) => {
  try {
    const appointments = await Appointment.find({ tenantId: req.user.userId })
      .populate("propertyId")
      .populate("ownerId", "name phone");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// OWNER views their appointments
exports.getAppointmentsByOwner = async (req, res) => {
  try {
    const appointments = await Appointment.find({ ownerId: req.user.userId })
      .populate("propertyId")
      .populate("tenantId", "name phone");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate("propertyId")
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (err) {
    console.error("Error fetching appointment by ID:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update appointment status (e.g. cancel, reject)
exports.updateAppointmentStatus = async (req, res) => {
  try {
     const { status } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const userId = req.user.userId;
    const isOwner = appointment.ownerId.toString() === userId;
    const isTenant = appointment.tenantId.toString() === userId;

    if (!isOwner && !isTenant) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    appointment.status = status;
    await appointment.save();

    // Notify the other party about the change
    const recipientId = isOwner ? appointment.tenantId : appointment.ownerId;
    let message = `Appointment status updated to ${status}.`;

    if (isOwner && (status === "cancelled" || status === "rejected")) {
      message = "Your appointment was rejected by the property owner.";
    } else if (isTenant && status === "cancelled") {
      message = "The tenant cancelled the appointment.";
    }

    await Notification.create({
      userId: recipientId,
      type: "appointment",
      referenceId: appointment._id,
      senderId: userId,
      message,
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
