const mongoose = require("mongoose"); 
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
 

  requirements: [
    {
      name: { type: String, required: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
    },
  ],
 
  features: [{ type: String }],
 
   ownerNotes: {
     type: String,
   },

   createdAt: {
     type: Date,
    default: Date.now,
  },
 });
 
 module.exports = mongoose.model("Property", propertySchema);

