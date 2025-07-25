const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true
    },

    title:{
        type: String,
        requred: true,
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

    status:{ 
        type : String, 
        enum: ["available","rented", "sold"], 
        default: "available"
    }, 
    createdAt:{ 
        type: Date, 
        default: Date.now
    }


});

module.exports = mongoose.model("Property", propertySchema);