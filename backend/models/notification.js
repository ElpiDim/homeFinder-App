const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,       // The recipient of the notification
  },
  type: {
    type: String,
      enum: [
      "interest",
      "interest_proposed",
      "interest_accepted",
      "interest_rejected",
      "message",
      "appointment",
      "property_removed",
      "favorite",
    ],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,       // Related item (property, appointment, etc.)
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",          // The user who triggered the notification (optional)
  },
  read: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: false
  }
}, { timestamps: true }); // Automatically adds createdAt & updatedAt

module.exports = mongoose.model("Notification", notificationSchema);
