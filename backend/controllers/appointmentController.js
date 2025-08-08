const Appointment = require("../models/appointments");
const Notification = require("../models/notification");

// OWNER proposes slots
exports.proposeAppointmentSlots = async (req, res) => {
  const { propertyId, tenantId, availableSlots } = req.body;
  const ownerId = req.user.userId;

  try {
    const appointment = new Appointment({
      propertyId,
      tenantId,
      ownerId,
      availableSlots
    });
    await appointment.save();

    await Notification.create({
    userId: tenantId,
    type: "appointment",                // ✅ valid enum type
    referenceId: appointment._id,      // ✅ matches your schema
    senderId: ownerId,                 // optional but helpful
    message: "You have new appointment options from the property owner.",
  });



    // TODO: create notification for tenant here if needed
    console.log(" User inside proposeAppointmentSlots:", req.user);


    res.status(201).json({ message: "Appointment slots proposed", appointment });
  } catch (err) {
    console.error("❌ Error proposing appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// TENANT confirms one slot
exports.confirmAppointmentSlot = async (req, res) => {
  const { appointmentId } = req.params;
  const { selectedSlot } = req.body;
  const tenantId = req.user.userId;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.tenantId.toString() !== tenantId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    appointment.selectedSlot = selectedSlot;
    appointment.status = "confirmed";
    await appointment.save();

    // TODO: notify owner (optional)

    res.json({ message: "Appointment confirmed", appointment });
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
      .populate("ownerId", "name");
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
      .populate("tenantId", "name");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate("propertyId")
      .populate("ownerId", "name")
      .populate("tenantId", "name");

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
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      { status: req.body.status },
      { new: true }
    );
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
