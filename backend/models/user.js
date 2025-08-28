// backend/models/user.js
const mongoose = require("mongoose");

/* ---------- Sub-schemas ---------- */
const preferencesSchema = new mongoose.Schema(
  {
    location: String,
    rentMin: Number,
    rentMax: Number,
    sqmMin: Number,
    sqmMax: Number,
    bedrooms: Number,
    bathrooms: Number,
    floorMin: Number,
    furnished: Boolean,
    petsAllowed: Boolean,
    smokingAllowed: Boolean,
    yearBuiltMin: Number,
    heatingType: { type: String, enum: ["autonomous", "central", "ac", "none"] },
  },
  { _id: false }
);

const requirementsSchema = new mongoose.Schema(
  {
    incomeMin: Number,
    incomeMax: Number,
    allowedOccupations: [String],
    familyStatus: { type: String, enum: ["single", "couple", "family", "any"], default: "any" },
    petsAllowed: Boolean,
    smokingAllowed: Boolean,
    workLocation: String,
    preferredTenantRegion: String,
  },
  { _id: false }
);

/* ---------- User schema ---------- */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      // default από το email (πριν το @)
      default: function () {
        try {
          return (this.email || "").split("@")[0] || "user";
        } catch {
          return "user";
        }
      },
    },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["client", "owner"],
      required: true,
    },

    // χρησιμοποιούνται σε profile/login controllers
    phone: { type: String },
    address: { type: String },

    age: Number,
    householdSize: Number,
    hasFamily: Boolean,
    hasPets: Boolean,
    smoker: Boolean,
    occupation: String,
    salary: Number,
    isWillingToHaveRoommate: Boolean,
    profilePicture: String,

    hasCompletedOnboarding: { type: Boolean, default: false },

    // δώσε default {} για να μην είναι undefined
    preferences: { type: preferencesSchema, default: {} },
    requirements: { type: requirementsSchema, default: {} },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
