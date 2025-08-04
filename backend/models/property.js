const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true
    },

    title:{
        type: String,
        required: true,
        trim: true 
    }, 
    price: {
        type: Number, 
        required: true
    }, 

    type:{
        type :String, 
        enum: ["rent", "sale"], 
        required: true
    }, 

    location:{ 
        type: String, 
        required: true
    }, 

    floor: {
        type: Number 
    },

    squareMeters:{
        type: Number
    },

    surface: {
        type: Number
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

    features: [{
        type: String
    }],

    status:{ 
        type : String, 
        enum: ["available","rented", "sold"], 
        default: "available"
    }, 
    images:[{
        type: String, 
        default: null
    }], 
    createdAt:{ 
        type: Date, 
        default: Date.now
    }
});

module.exports = mongoose.model("Property", propertySchema);
