const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // receiver
  },

  type: {
    type: String,
    enum: [
      "message",
      "appointment",
      "property_removed",
      "property_status",
      "favorite",

      // 🔥 MATCH SYSTEM
      "match_pending",
      "match_accepted",
      "match_rejected",
    ],
    required: true,
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // matchId / propertyId / appointmentId κλπ
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  read: {
    type: Boolean,
    default: false,
  },

  message: {
    type: String,
  },

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);