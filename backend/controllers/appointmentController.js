const Appointment = require("../models/appointments");
const Notification = require("../models/notification");
const Property = require("../models/property");
const Message = require("../models/messages");

const SORT_BY_UPCOMING = { selectedSlot: 1, "availableSlots.0": 1, createdAt: -1 };

const normalizeSlots = (slots = []) => {
  const timestamps = slots
    .map((slot) => new Date(slot))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => date.getTime());

  return [...new Set(timestamps)].sort((a, b) => a - b).map((ms) => new Date(ms));
};

const formatSlot = (date) =>
  new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const ensureParticipant = (appointment, userId) => {
  const ownerMatch = String(appointment.ownerId) === String(userId);
  const tenantMatch = String(appointment.tenantId) === String(userId);
  return { ownerMatch, tenantMatch, allowed: ownerMatch || tenantMatch };
};

const sendAppointmentNotification = async (req, { userId, senderId, referenceId, message }) => {
  const notification = await Notification.create({
    userId,
    senderId,
    type: "appointment",
    referenceId,
    message,
  });

  const io = req.app.get("io");
  if (io) {
    io.to(userId.toString()).emit("notification", notification);
  }

  return notification;
};

exports.proposeAppointmentSlots = async (req, res) => {
  const { propertyId, tenantId, availableSlots = [] } = req.body;
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

    const normalizedSlots = normalizeSlots(availableSlots);
    if (!normalizedSlots.length) {
      return res.status(400).json({ message: "Please provide at least one valid slot" });
    }

    const appointment = await Appointment.create({
      propertyId,
      tenantId,
      ownerId: property.ownerId,
      availableSlots: normalizedSlots,
      status: "pending",
    });

    await sendAppointmentNotification(req, {
      userId: tenantId,
      senderId: ownerId,
      referenceId: appointment._id,
      message: property.title
        ? `New appointment options for "${property.title}"`
        : "New appointment options from the property owner.",
    });

    res.status(201).json({ message: "Appointment slots proposed", appointment });
  } catch (err) {
    console.error("❌ Error proposing appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.acceptAppointmentSlot = async (req, res) => {
  const appointmentId = req.params.appointmentId || req.params.id;
  const { selectedSlot } = req.body;
  const tenantId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId).populate(
      "propertyId",
      "title ownerId"
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const { tenantMatch } = ensureParticipant(appointment, tenantId);
    if (!tenantMatch) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!selectedSlot) {
      return res.status(400).json({ message: "No slot selected" });
    }

    if (appointment.status === "confirmed") {
      return res.status(400).json({ message: "Appointment already confirmed" });
    }

    const slotDate = new Date(selectedSlot);
    if (Number.isNaN(slotDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const isValidSlot = appointment.availableSlots.some(
      (slot) => new Date(slot).getTime() === slotDate.getTime()
    );

    if (!isValidSlot) {
      return res
        .status(400)
        .json({ message: "Selected slot is not one of the proposed options" });
    }

    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      propertyId: appointment.propertyId,
      status: "confirmed",
      selectedSlot: slotDate,
    });

    if (conflict) {
      return res.status(400).json({ message: "Selected slot is already booked" });
    }

    appointment.selectedSlot = slotDate;
    appointment.status = "confirmed";
    await appointment.save();

    const humanReadable = formatSlot(slotDate);

    await sendAppointmentNotification(req, {
      userId: appointment.ownerId,
      senderId: tenantId,
      referenceId: appointment._id,
      message: `Appointment confirmed for ${humanReadable}.`,
    });

    await Message.create({
      senderId: tenantId,
      receiverId: appointment.ownerId,
      propertyId: appointment.propertyId,
      content: `Appointment confirmed for ${humanReadable}.`,
    });

    res.json({ message: "Appointment confirmed", appointment });
  } catch (err) {
    console.error("❌ Error confirming appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAppointmentsByTenant = async (req, res) => {
  try {
    const filter = { tenantId: req.user.userId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment.find(filter)
      .populate("propertyId")
      .populate("ownerId", "name email phone")
      .sort(SORT_BY_UPCOMING);

    res.json(appointments);
  } catch (err) {
    console.error("❌ Error fetching tenant appointments:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAppointmentsByOwner = async (req, res) => {
  try {
    const filter = { ownerId: req.user.userId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment.find(filter)
      .populate("propertyId")
      .populate("tenantId", "name email phone")
      .sort(SORT_BY_UPCOMING);

    res.json(appointments);
  } catch (err) {
    console.error("❌ Error fetching owner appointments:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAppointmentById = async (req, res) => {
  const appointmentId = req.params.appointmentId || req.params.id;
  const userId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("propertyId")
      .populate("ownerId", "name phone email")
      .populate("tenantId", "name phone email");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const { allowed } = ensureParticipant(appointment, userId);
    if (!allowed) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(appointment);
  } catch (err) {
    console.error("Error fetching appointment by ID:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const declineAppointmentInternal = async (appointment, actorId, req) => {
  appointment.status = "declined";
  appointment.selectedSlot = undefined;
  await appointment.save();

  const isOwner = String(appointment.ownerId) === String(actorId);
  const recipientId = isOwner ? appointment.tenantId : appointment.ownerId;
  const actorLabel = isOwner ? "owner" : "tenant";
  const title = appointment.propertyId?.title || "the property";

  await sendAppointmentNotification(req, {
    userId: recipientId,
    senderId: actorId,
    referenceId: appointment._id,
    message: `The ${actorLabel} declined the appointment for ${title}.`,
  });

  return appointment;
};

exports.declineAppointment = async (req, res) => {
  const appointmentId = req.params.appointmentId || req.params.id;
  const userId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId).populate(
      "propertyId",
      "title"
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const { allowed } = ensureParticipant(appointment, userId);
    if (!allowed) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await declineAppointmentInternal(appointment, userId, req);

    res.json({ message: "Appointment declined", appointment });
  } catch (err) {
    console.error("❌ Error declining appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const cancelAppointmentInternal = async (appointment, actorId, req) => {
  appointment.status = "cancelled";
  await appointment.save();

  const isOwner = String(appointment.ownerId) === String(actorId);
  const recipientId = isOwner ? appointment.tenantId : appointment.ownerId;
  const actorLabel = isOwner ? "owner" : "tenant";
  const title = appointment.propertyId?.title || "the property";

  await sendAppointmentNotification(req, {
    userId: recipientId,
    senderId: actorId,
    referenceId: appointment._id,
    message: `The ${actorLabel} cancelled the appointment for ${title}.`,
  });

  return appointment;
};

exports.cancelAppointment = async (req, res) => {
  const appointmentId = req.params.appointmentId || req.params.id;
  const userId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId).populate(
      "propertyId",
      "title"
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const { allowed } = ensureParticipant(appointment, userId);
    if (!allowed) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await cancelAppointmentInternal(appointment, userId, req);

    res.json({ message: "Appointment cancelled", appointment });
  } catch (err) {
    console.error("❌ Error cancelling appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  const { status } = req.body;

  if (status === "cancelled") {
    return exports.cancelAppointment(req, res);
  }
  if (status === "declined") {
    return exports.declineAppointment(req, res);
  }

  return res.status(400).json({ message: "Unsupported status update" });
};
