const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      trim: true,
    },

    role: {
      type: String,
      enum: ["client", "owner", "admin"], // client = tenant
      default: "client",
    },

    // --- Tenant profile fields (για eligibility) ---
    address: { type: String, trim: true },
    occupation: { type: String, trim: true },
    salary: { type: Number, min: 0 },        // μηνιαίο ή ετήσιο όπως το ορίζεις στο app
    age: { type: Number, min: 0 },
    householdSize: { type: Number, min: 1, default: 1 }, // αριθμός ατόμων που θα μείνουν
    hasPets: { type: Boolean, default: false },
    smoker: { type: Boolean, default: false },

    profilePicture: String,

    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,

    favorites: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Property" }
    ],
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Χρήσιμα indexes
userSchema.index({ emailVerified: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
