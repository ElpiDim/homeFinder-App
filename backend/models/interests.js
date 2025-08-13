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
      enum: ["pending", "accepted", "rejected"], // ← align with “reject”
      default: "pending",
      index: true,
    },

    // set by owner when proposing a visit time (optional)
    preferredDate: { type: Date },
  },
  { timestamps: { createdAt: "submittedAt", updatedAt: true } }
);

// prevent duplicate interests per tenant/property
interestSchema.index({ tenantId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model("Interest", interestSchema);
