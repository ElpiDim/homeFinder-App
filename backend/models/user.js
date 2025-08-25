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
