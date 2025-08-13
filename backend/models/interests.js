const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },
  message: String,

  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending"
  },

  // Dates proposed by the owner; tenant may later choose one
  proposedDates: [{
    type: Date,
    default: undefined
  }],

  preferredDate: { // 👈 από τον OWNER
    type: Date
  },

  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Interest", interestSchema);
