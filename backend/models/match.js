const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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
  status: {
    type: String,
    enum: ["pending_owner_review", "accepted", "rejected"],
    default: "pending_owner_review",
  },
  propertyMatchScore: Number,
  tenantMatchScore: Number,
  combinedScore: Number,
}, { timestamps: true });

matchSchema.index({ clientId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model("Match", matchSchema);