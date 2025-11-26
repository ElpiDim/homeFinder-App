const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "declined", "cancelled"],
      default: "pending",
    },

    availableSlots: {
      type: [Date],
      default: [],
    },
    selectedSlot: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
