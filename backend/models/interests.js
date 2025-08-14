// models/interests.js
const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    message: { type: String, trim: true },

  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending"
  },

  preferredDate: { // 👈 από τον OWNER
    type: Date
  },

  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Interest", interestSchema);
