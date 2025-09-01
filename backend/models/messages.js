const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    senderId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true,
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    propertyId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Property", 
        required: true,
    },
    content:{
        type: String, 
        required: true,
    },
    timeStamp:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Message", messageSchema);