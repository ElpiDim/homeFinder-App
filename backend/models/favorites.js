const mongoose = require("mongoose");

const favoritesSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    propertyId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        rewuired: true,
    },

    createdAt:{
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Favorites", favoritesSchema);