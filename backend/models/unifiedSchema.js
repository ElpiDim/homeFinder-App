const mongoose = require('mongoose');

const criteriaSchema = new mongoose.Schema({
  // Property attributes
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
  heatingType: { type: String, enum: ['autonomous', 'central', 'ac', 'gas', 'none'] },

  // Tenant attributes
  occupation: { type: String, trim: true },
  income: { type: Number, min: 0 },
  familyStatus: { type: String, enum: ['Single', 'couple', 'family'] },
  pets: { type: Boolean },
  smoker: { type: Boolean },

}, { _id: false });

module.exports = criteriaSchema;
