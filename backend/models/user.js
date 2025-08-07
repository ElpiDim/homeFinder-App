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

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  {
    timestamps: true, // 👈 προσθέτει createdAt και updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);
