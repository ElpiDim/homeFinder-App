const mongoose = require("mongoose");


const preferencesSchema = new mongoose.Schema(
  {
    location: String,
    rentMin: Number,
    rentMax: Number,
    sqmMin: Number,
    sqmMax: Number,
    bedrooms: Number,
    bathrooms: Number,
    floorMin: Number,
    furnished: Boolean,
    petsAllowed: Boolean,
    smokingAllowed: Boolean,
    yearBuiltMin: Number,
    heatingType: { type: String, enum: ["autonomous", "central", "ac", "none"] }
  },
  { _id: false }
);

const requirementsSchema = new mongoose.Schema(
  {
    incomeMin: Number,
    incomeMax: Number,
    allowedOccupations: [String],
    familyStatus: {
      type: String,
      enum: ["single", "couple", "family", "any"],
      default: "any"
    },
    petsAllowed: Boolean,
    smokingAllowed: Boolean,
    workLocation: String,
    preferredTenantRegion: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
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

   preferences: preferencesSchema,
   requirements: requirementsSchema,

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
