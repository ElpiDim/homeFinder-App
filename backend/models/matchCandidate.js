const mongoose = require("mongoose");

const matchCandidateSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    considered: {
      type: Number,
      default: 0,
    },
    matched: {
      type: Number,
      default: 0,
    },
    ownerNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

matchCandidateSchema.index({ propertyId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model("MatchCandidate", matchCandidateSchema);
