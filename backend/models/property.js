// backend/models/property.js
const mongoose = require("mongoose");
const { criteriaSchema } = require("./unifiedSchema");

const propertySchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // core
  title: { type: String, required: true },
  description: { type: String },
  location: { type: String, required: true },
  address: { type: String },

  // use `price` in DB; allow using `rent` in code via alias
  price: { type: Number, required: true, alias: "rent" },

  // listing type (optional but useful)
  type: { type: String, enum: ["rent", "sale"], default: "rent" },

  // dims
  squareMeters: { type: Number, alias: "sqm" },
  yearBuilt: { type: Number },
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  floor: { type: Number },

  // booleans / features
  furnished: { type: Boolean, default: false },
  parking: { type: Boolean, default: false },

  // store as `elevator`, but allow using `hasElevator` in code
  elevator: { type: Boolean, default: false, alias: "hasElevator" },

  // store as `heatingType`, allow using `heating`
  heatingType: {
    type: String,
    enum: ["autonomous", "central", "ac", "gas", "none", "other"],
    default: "none",
    alias: "heating",
  },

  petsAllowed: { type: Boolean, default: false },
  smokingAllowed: { type: Boolean, default: false },

  images: [{ type: String }],

  status: {
    type: String,
    enum: ["available", "rented", "sold"],
    default: "available",
  },

  // Owner's requirements for tenants
  tenantRequirements: {
    // Use the shared criteria schema so that tenant requirements
    // and tenant search filters share an identical structure.
    type: criteriaSchema,
    default: () => ({}),
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Property", propertySchema);
