const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["client", "owner"],
    
    },

    age: Number,
    householdSize: Number,
    hasFamily: Boolean,
    hasPets: Boolean,
    smoker: Boolean,
    occupation: String,
    salary: Number,
    isWillingToHaveRoommate: Boolean,
    profilePicture: String,

    hasCompletedOnboarding: {
      type: Boolean,
      default: false
    },

    preferences: {
      type: {
        type: String,
        enum: ["rent", "sale"],
        default: "rent"
      },
      location: String,
      minPrice: Number,
      maxPrice: Number,
      minSqm: Number,
      maxSqm: Number,
      bedrooms: Number,
      bathrooms: Number,
      petsAllowed: Boolean,
      smokingAllowed: Boolean,
      furnished: Boolean
    },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
          ref: "Property"
      }
    ]
  }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
