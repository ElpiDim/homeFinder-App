// backend/models/property.js
const mongoose = require("mongoose");

const tenantRequirementsSchema = new mongoose.Schema(
  {
    minTenantSalary: { type: Number },              // € min μισθός
    allowedOccupations: [{ type: String, trim: true }],
    minTenantAge: { type: Number, min: 0 },
    maxTenantAge: { type: Number, min: 0 },
    maxHouseholdSize: { type: Number, min: 1 },
    roommatePreference: {
      type: String,
      enum: ['any', 'roommates_only', 'no_roommates'],
      default: 'any',
    },
    furnished: { type: Boolean },                   // απαιτείται να είναι επιπλωμένο;
    parking: { type: Boolean },                     // απαιτείται θέση πάρκινγκ;
    hasElevator: { type: Boolean },                 // απαιτείται ασανσέρ;
    pets: { type: Boolean },                        // επιτρέπονται κατοικίδια;
    smoker: { type: Boolean },                      // επιτρέπεται καπνιστής;
    familyStatus: { type: String, trim: true },     // προτιμώμενη οικογενειακή κατάσταση
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // --- core ---
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, required: true, trim: true }, // εμφανιζόμενο
    address: { type: String, trim: true },                  // πιο “ακριβές” αν υπάρχει

    // canonical price (ενοποιημένο από 'rent')
    price: { type: Number, required: true, min: 0 },

    // listing type
    type: { type: String, enum: ["rent", "sale"], default: "rent" },

    // status
    status: { type: String, enum: ["available", "rented", "sold"], default: "available" },

    // --- dimensions / βασικά ---
    squareMeters: { type: Number, min: 0 }, // primary
    surface: { type: Number, min: 0 },      // optional alt
    floor: { type: Number, min: 0 },
    levels: { type: Number, min: 0 },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    wc: { type: Number, min: 0 },
    kitchens: { type: Number, min: 0 },
    livingRooms: { type: Number, min: 0 },
    onTopFloor: { type: Boolean, default: false },

    // --- έξτρα γνωρίσματα ---
    yearBuilt: { type: Number, min: 0 },
    condition: {
      type: String,
      enum: ["", "new", "renovated", "good", "needs renovation"],
      default: "",
    },
    heating: {
      type: String,
      enum: ["", "none", "central", "autonomous", "gas", "ac", "other"],
      default: "",
    },
    energyClass: {
      type: String,
      enum: ["", "A+", "A", "B+", "B", "C", "D", "E", "F", "G"],
      default: "",
    },
    orientation: {
      type: String,
      enum: [
        "", "north", "north-east", "east", "south-east",
        "south", "south-west", "west", "north-west",
      ],
      default: "",
    },
    furnished: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    hasElevator: { type: Boolean, default: false },
    hasStorage: { type: Boolean, default: false },
    parkingSpaces: { type: Number, min: 0 },
    monthlyMaintenanceFee: { type: Number, min: 0 },
    view: {
      type: String,
      enum: ["", "sea", "mountain", "park", "city", "none"],
      default: "",
    },
    insulation: { type: Boolean, default: false },
    plotSize: { type: Number, min: 0 },

    ownerNotes: { type: String, trim: true }, // private στο UI

    // --- media ---
    images: [{ type: String, trim: true }],     // paths από /uploads
    floorPlanImage: { type: String, trim: true },

    // --- features (tags) ---
    features: [{ type: String, trim: true }],

    // --- γεωγραφικά ---
    latitude: { type: Number },
    longitude: { type: Number },

    // --- requirements από ιδιοκτήτη για ενοικιαστή ---
    tenantRequirements: {
      type: tenantRequirementsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

/**
 * Backward compatibility:
 * - Επιτρέπουμε πρόσβαση σε `rent` ως virtual που διαβάζει/γράφει `price`
 *   ώστε παλιός κώδικας που στέλνει/περιμένει rent να μη σπάσει.
 */
propertySchema
  .virtual("rent")
  .get(function () {
    return this.price;
  })
  .set(function (val) {
    this.price = val;
  });

// Ensure virtuals show up in JSON if χρειάζεται
propertySchema.set("toJSON", { virtuals: true });
propertySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Property", propertySchema);
