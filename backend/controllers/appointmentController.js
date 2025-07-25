const Appointment = require("../models/appointments");

exports.requestAppointment = async (req, res) => {
  const { propertyId, dateTime } = req.body;
  const tenantId = req.user.userId;

  try {
    const appointment = new Appointment({ tenantId, propertyId, dateTime });
    await appointment.save();
    res.status(201).json({ message: "Appointment requested" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAppointmentsByTenant = async (req, res) => {
  try {
    const appointments = await Appointment.find({ tenantId: req.user.userId }).populate("propertyId");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

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
