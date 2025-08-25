const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
    },

    role: {
      type: String,
      enum: ["client", "owner"],
      default: "client",
    },

    address: String,
    occupation: String,
    salary: Number,
    profilePicture: String,
    workLocation: String, 
    familyStatus: String,
    householdWorkers: String, 
    pets: Boolean, 
    smoker: Boolean,

    preferences:{ 
      location: String, 
      squareMeters: Number, 
      floor: Number, 
      rentMin: Number, 
      rentMax: Number,
      yearBuilt: Number, 
      yearRenovated: Number, 
      bedrooms: Number,
      furnished: Boolean, 
      parking:Boolean, 
      heating:{
        type: String, 
        enum: ["autonomous", "central","aircondition","fireplace","none"],
      },
    },
    // ✅ Email verification flags
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// (προαιρετικό) index για γρήγορα queries σε verified χρήστες
userSchema.index({ emailVerified: 1 });

module.exports = mongoose.model("User", userSchema);
