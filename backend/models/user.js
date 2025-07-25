const mongoose = require("mongoose");
const userSchema =  new mongoose.Schema({
    name: {
        type: String, 
        required: true,
    }, 

    email:{
        type: String, 
        required: true, 
        unigue: true //no users with same emails 

    },
    password:{
        type: String, 
        required: true,
    },

    phone:{
        type: String, 
    },

    role:{
        type: String,
        enum: ["client", "owner"], 
        default: "client", 
    }, 
    address: String, 
    occupation: String,
    salary: Number,
}); 

module.exports = mongoose.model("User", userSchema);
    
