const mongoose = require("mongoose");

// --- Subschemas ---

const preferencesSchema = new mongoose.Schema(
  {
    // Πρώτη βασική επιλογή: Ενοικίαση ή Αγορά
    dealType: { type: String, enum: ["rent", "sale"], default: "rent" },

    // Κοινά πεδία
    location: { type: String, trim: true },
    sqmMin: { type: Number, min: 0 },
    sqmMax: { type: Number, min: 0 },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },

    // Όροφος: επιτρέπω range
    floorMin: { type: Number },
    floorMax: { type: Number },

    furnished: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    elevator: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },

    yearBuiltMin: { type: Number, min: 0 },

    // Θέρμανση / Κλιματισμός
    heatingType: { type: String, enum: ["autonomous", "central", "ac", "none"], default: "none" },

    // Τιμές ανά τύπο συναλλαγής
    rentMin: { type: Number, min: 0 },
    rentMax: { type: Number, min: 0 },
    saleMin: { type: Number, min: 0 },
    saleMax: { type: Number, min: 0 },
  },
  { _id: false }
);

const requirementsSchema = new mongoose.Schema(
  {
    incomeMin: { type: Number, min: 0 },
    incomeMax: { type: Number, min: 0 },
    allowedOccupations: [{ type: String, trim: true }],
    familyStatus: {
      type: String,
      enum: ["single", "couple", "family", "any"],
      default: "any",
    },
    petsAllowed: { type: Boolean, default: true },
    smokingAllowed: { type: Boolean, default: true },
    workLocation: { type: String, trim: true },
    preferredTenantRegion: { type: String, trim: true },
  },
  { _id: false }
);

// --- Main schema ---

const userSchema = new mongoose.Schema(
  {
    // Προσωπικά στοιχεία
    name: { type: String, trim: true },
    phone: { type: String, trim: true }, // ΝΕΟ: για τη φόρμα onboarding

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

    // Δημογραφικά / lifestyle για onboarding
    age: { type: Number, min: 0 },
    householdSize: { type: Number, min: 0 },
    hasFamily: { type: Boolean, default: false },
    hasPets: { type: Boolean, default: false },
    smoker: { type: Boolean, default: false },
    occupation: { type: String, trim: true },
    salary: { type: Number, min: 0 },
    isWillingToHaveRoommate: { type: Boolean, default: false },
    profilePicture: { type: String, trim: true },

    // Flag πρώτης σύνδεσης / ολοκληρωμένου onboarding
    onboardingCompleted: { type: Boolean, default: false },

    // Προτιμήσεις ενοικίασης/αγοράς + απαιτήσεις (ιδιοκτήτης)
    preferences: { type: preferencesSchema, default: () => ({}) },
    requirements: { type: requirementsSchema, default: () => ({}) },

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
