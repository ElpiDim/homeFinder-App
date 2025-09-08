const mongoose = require("mongoose");
const { criteriaSchema } = require('./unifiedSchema');

// Sub-schema for tenant's personal profile, based on the unified schema
const clientProfileSchema = new mongoose.Schema({
  occupation: criteriaSchema.path('occupation'),
  income: criteriaSchema.path('income'),
  familyStatus: criteriaSchema.path('familyStatus'),
  pets: criteriaSchema.path('pets'),
  smoker: criteriaSchema.path('smoker'),
}, { _id: false });

// Reuse the shared criteria schema for property preferences so
// that the structure matches property tenant requirements.
const propertyPreferencesSchema = criteriaSchema;


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

    // Minimum number of matching criteria required before a
    // property is considered a match for this user.
    matchThreshold: { type: Number, default: 2 },

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
