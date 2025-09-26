// backend/models/user.js
const mongoose = require("mongoose");

// --- Subschemas ---

// Κοινά πεδία για requirements & (προαιρετικά) preferences ώστε να ταιριάζουν.
// Στα booleans default: undefined => "no restriction / no preference"
const requirementFields = {
  incomeMin: { type: Number, min: 0 },
  incomeMax: { type: Number, min: 0 },
  allowedOccupations: [{ type: String, trim: true }],
  familyStatus: {
    type: String,
    enum: ["single", "couple", "family", "any"],
    default: "any",
  },
  petsAllowed: { type: Boolean, default: undefined },
  smokingAllowed: { type: Boolean, default: undefined },
  workLocation: { type: String, trim: true },
  preferredTenantRegion: { type: String, trim: true },
};

const preferencesSchema = new mongoose.Schema(
  {
    // Βασική επιλογή: Ενοικίαση ή Αγορά
    dealType: { type: String, enum: ["rent", "sale"], default: "rent" },

    // Κοινά πεδία
    location: { type: String, trim: true },
    sqmMin: { type: Number, min: 0 },
    sqmMax: { type: Number, min: 0 },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },

    // Όροφος (range)
    floorMin: { type: Number },
    floorMax: { type: Number },

    // Tri-state: undefined => καμία προτίμηση
    furnished: { type: Boolean, default: undefined },
    elevator: { type: Boolean, default: undefined },
    parking: { type: Boolean, default: undefined },

    yearBuiltMin: { type: Number, min: 0 },

    // Θέρμανση / Κλιματισμός (undefined => καμία προτίμηση)
    heatingType: {
      type: String,
      enum: ["autonomous", "central", "ac", "none"],
      default: undefined,
    },

    // Τιμές ανά τύπο συναλλαγής
    rentMin: { type: Number, min: 0 },
    rentMax: { type: Number, min: 0 },
    saleMin: { type: Number, min: 0 }, // mapped από/σε priceMin
    saleMax: { type: Number, min: 0 }, // mapped από/σε priceMax

    // Επιπλέον constraints που “μοιράζονται” με requirements για matching
    ...requirementFields,
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals για FE συμβατότητα (buy budget)
preferencesSchema
  .virtual("priceMin")
  .get(function () {
    return this.saleMin;
  })
  .set(function (v) {
    this.saleMin = v;
  });

preferencesSchema
  .virtual("priceMax")
  .get(function () {
    return this.saleMax;
  })
  .set(function (v) {
    this.saleMax = v;
  });

// Virtual intent <-> dealType (rent <-> rent, buy <-> sale)
preferencesSchema
  .virtual("intent")
  .get(function () {
    return this.dealType === "sale" ? "buy" : "rent";
  })
  .set(function (v) {
    this.dealType = v === "buy" ? "sale" : "rent";
  });

const requirementsSchema = new mongoose.Schema(requirementFields, {
  _id: false,
});

// --- Main schema ---

const userSchema = new mongoose.Schema(
  {
    // Προσωπικά στοιχεία
    name: { type: String, trim: true },
    phone: { type: String, trim: true }, // για τη φόρμα onboarding

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
  },
  { timestamps: true }
);

// Μοναδικός δείκτης email
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
