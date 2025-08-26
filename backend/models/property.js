const mongoose = require("mongoose"); 
const tenantRequirementsSchema = new mongoose.Schema(
  {
    minTenantSalary: { type: Number },
    allowedOccupations: [{ type: String }],
    requiresFamily: { type: Boolean, default: false },
    allowsSmokers: { type: Boolean, default: false },
    allowsPets: { type: Boolean, default: false },
    maxOccupants: { type: Number },
  },
  { _id: false }
);

 const propertySchema = new mongoose.Schema({
   ownerId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User",
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
   price: {
     type: Number,
    required: true,
   },
 
  type: {
    type: String,
    enum: ["rent", "sale"],
    required: true,
   },
 
  status: {
    type: String,
    enum: ["available", "rented", "sold"],
    default: "available",
   },
 
  images: [{ type: String }],
 
  floorPlanImage: {
    type: String,
   },
 
  squareMeters: { type: Number },
  plotSize: { type: Number },
  yearBuilt: { type: Number },
 
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  kitchens: { type: Number },
  livingRooms: { type: Number },
 
  floor: { type: Number },
  levels: { type: Number },
  wc: { type: Number },
  parkingSpaces: { type: Number },
 
  furnished: { type: Boolean, default: false },
  hasElevator: { type: Boolean, default: false },
  hasStorage: { type: Boolean, default: false },
  insulation: { type: Boolean, default: false },
  petsAllowed: { type: Boolean, default: false },
  smokingAllowed: { type: Boolean, default: false },
 
  condition: {
    type: String,
    enum: ["new", "renovated", "good", "needs_renovation"],
    default: "good",
   },
 
   heating: {
     type: String,
     enum: ["none", "central", "autonomous", "gas", "ac", "other"],
    default: "none",
   },
 
   energyClass: {
     type: String,
     enum: ["A+", "A", "B", "C", "D", "E", "F", "G"],

    default: "C",
   },
 
   orientation: {
     type: String,
    enum: [
      "north",
      "south",
      "east",
      "west",
      "north-east",
      "north-west",
      "south-east",
      "south-west",
    ],
   },
 
   view: {
     type: String,
     enum: ["sea", "mountain", "city", "park", "none"],
    default: "none",
   },
 
  features: [{ type: String }],
 
   ownerNotes: {
     type: String,
   },
 
  tenantRequirements: tenantRequirementsSchema,

   createdAt: {
     type: Date,
    default: Date.now,
  },
 });
 
 module.exports = mongoose.model("Property", propertySchema);

