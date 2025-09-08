const mongoose = require("mongoose");
const unifiedSchema = require('./unifiedSchema');

// Sub-schema for tenant's personal profile, based on the unified schema
const clientProfileSchema = new mongoose.Schema({
  occupation: unifiedSchema.path('occupation'),
  income: unifiedSchema.path('income'),
  familyStatus: unifiedSchema.path('familyStatus'),
  pets: unifiedSchema.path('pets'),
  smoker: unifiedSchema.path('smoker'),
}, { _id: false });

// Sub-schema for tenant's property preferences, based on the unified schema
const propertyPreferencesSchema = new mongoose.Schema({
  location: unifiedSchema.path('location'),
  rent: unifiedSchema.path('rent'),
  sqm: unifiedSchema.path('sqm'),
  bedrooms: unifiedSchema.path('bedrooms'),
  bathrooms: unifiedSchema.path('bathrooms'),
  floor: unifiedSchema.path('floor'),
  yearBuilt: unifiedSchema.path('yearBuilt'),
  furnished: unifiedSchema.path('furnished'),
  parking: unifiedSchema.path('parking'),
  elevator: unifiedSchema.path('elevator'),
  heatingType: unifiedSchema.path('heatingType'),
}, { _id: false });


// --- Main schema ---

const userSchema = new mongoose.Schema(
  {
    // Personal info
    name: { type: String, trim: true },
    phone: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["client", "owner"],
      required: true,
      default: "client",
    },

    profilePicture: { type: String, trim: true },

    // Onboarding completion flag
    onboardingCompleted: { type: Boolean, default: false },

    // Tenant-specific fields
    clientProfile: {
      type: clientProfileSchema,
      default: () => ({}),
    },
    propertyPreferences: {
      type: propertyPreferencesSchema,
      default: () => ({})
    },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  { timestamps: true }
);

// Μοναδικός δείκτης email (sparse όχι απαραίτητο αφού email required)
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
