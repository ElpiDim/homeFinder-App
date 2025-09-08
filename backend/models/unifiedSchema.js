const mongoose = require('mongoose');

// Central list of all criteria fields that can be used both as
// owner requirements and as tenant search filters. Having a
// single definition keeps the backend models and frontend forms
// in sync and makes future additions straightforward.
const criteriaFields = {
  // --- Property attributes ---
  location: { type: String, trim: true },
  rent: { type: Number, min: 0 },
  sqm: { type: Number, min: 0 },
  bedrooms: { type: Number, min: 0 },
  bathrooms: { type: Number, min: 0 },
  floor: { type: Number },
  yearBuilt: { type: Number, min: 0 },
  furnished: { type: Boolean },
  parking: { type: Boolean },
  elevator: { type: Boolean },
  heatingType: {
    type: String,
    enum: ['autonomous', 'central', 'ac', 'gas', 'none', 'other'],
  },

  // --- Tenant attributes ---
  occupation: { type: String, trim: true },
  income: { type: Number, min: 0 },
  familyStatus: { type: String, enum: ['Single', 'Couple', 'Family'] },
  pets: { type: Boolean },
  smoker: { type: Boolean },
};

// Build a reusable schema from the above field definitions.
// The same schema instance can be embedded in different models
// (e.g. property requirements, tenant filters) to guarantee a
// consistent structure in the database.
const criteriaSchema = new mongoose.Schema(criteriaFields, { _id: false });

module.exports = { criteriaFields, criteriaSchema };

