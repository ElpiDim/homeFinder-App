const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  price: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ["rent", "sale"],
    required: true
  },

  location: {
    type: String,
    required: true
  },

  address: {
    type: String,
    trim: true
  },

  floor: {
    type: Number
  },

  squareMeters: {
    type: Number
  },

  surface: {
    type: Number
  },

  plotSize: {
    type: Number // ειδικά για μονοκατοικίες/οικόπεδα
  },

  yearBuilt: {
    type: Number
  },

  condition: {
    type: String,
    enum: ["new", "renovated", "good", "needs renovation"],
    default: "good"
  },

  onTopFloor: {
    type: Boolean,
    default: false
  },

  levels: {
    type: Number,
    default: 1
  },

  bedrooms: {
    type: Number,
    default: 0
  },

  bathrooms: {
    type: Number,
    default: 0
  },

  wc: {
    type: Number,
    default: 0
  },

  kitchens: {
    type: Number,
    default: 0
  },

  livingRooms: {
    type: Number,
    default: 0
  },

  parkingSpaces: {
    type: Number,
    default: 0
  },

  hasElevator: {
    type: Boolean,
    default: false
  },

  hasStorage: {
    type: Boolean,
    default: false
  },

  furnished: {
    type: Boolean,
    default: false
  },

  heating: {
    type: String,
    enum: ["none", "central", "autonomous", "gas", "ac", "other"],
    default: "none"
  },

  energyClass: {
    type: String,
    enum: ["A+", "A", "B", "C", "D", "E", "F", "G"],
    default: "C"
  },

  orientation: {
    type: String,
    enum: ["north", "south", "east", "west", "north-east", "north-west", "south-east", "south-west"]
  },

  petsAllowed: {
    type: Boolean,
    default: false
  },

  smokingAllowed: {
    type: Boolean,
    default: false
  },

  monthlyMaintenanceFee: {
    type: Number,
    default: 0
  },

  view: {
    type: String,
    enum: ["sea", "mountain", "city", "park", "none"],
    default: "none"
  },

  insulation: {
    type: Boolean,
    default: false
  },

  features: [{
    type: String
  }],

  status: {
    type: String,
    enum: ["available", "rented", "sold"],
    default: "available"
  },

  images: [{
    type: String,
    default: null
  }],

  floorPlanImage: {
    type: String
  },

  latitude: { type: Number },
  longitude: { type: Number },

  ownerNotes: {
    type: String,
    trim: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Property", propertySchema);
