const mongoose = require("mongoose");
const unifiedSchema = require('./unifiedSchema');

// Sub-schema for owner's tenant requirements, based on the unified schema
const tenantRequirementsSchema = new mongoose.Schema({
  occupation: unifiedSchema.path('occupation'),
  income: unifiedSchema.path('income'),
  familyStatus: unifiedSchema.path('familyStatus'),
  pets: unifiedSchema.path('pets'),
  smoker: unifiedSchema.path('smoker'),
}, { _id: false });


const propertySchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  location: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  rent: {
    type: Number,
    required: true,
  },
  sqm: {
    type: Number
  },
  yearBuilt: {
    type: Number
  },
  bedrooms: {
    type: Number
  },
  bathrooms: {
    type: Number
  },
  floor: {
    type: Number
  },
  furnished: {
    type: Boolean, default: false
  },
  parking: {
    type: Boolean, default: false
  },
  elevator: {
    type: Boolean, default: false
  },
  heatingType: {
    type: String,
    enum: ['autonomous', 'central', 'ac', 'gas', 'none'],
    default: 'none',
  },
  petsAllowed: { // This is a property feature, not a tenant requirement
    type: Boolean, default: false
  },
  smokingAllowed: { // This is a property feature, not a tenant requirement
    type: Boolean, default: false
  },

  images: [{ type: String }],

  status: {
    type: String,
    enum: ["available", "rented", "sold"],
    default: "available",
  },

  // Owner's requirements for tenants
  tenantRequirements: {
    type: tenantRequirementsSchema,
    default: () => ({})
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Property", propertySchema);

