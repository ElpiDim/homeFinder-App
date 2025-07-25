const mongoose = require("mongoose");
const appointmentsSchema = new mongoose.Schema({
    tenantId:{
        type: mongoose.Schema.Types.ObjectId, 
        ref:"User",
        required: true
    },
    propertyId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Property", 
        required:true
    },
    dateTime:{
        type:Date,
        required: true
    },

    status:{
        type: String,
        enum: ["pending", "confirmed","cancelled"],
        default: "pending"
    },

    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Appointment", appointmentsSchema);