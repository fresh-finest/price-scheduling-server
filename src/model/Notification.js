const mongoose = require("mongoose");


const notificationSchema = new mongoose.Schema({
    // userId:{type: mongoose.Schema.Types.ObjectId, ref:"User", required:true},
    // userId:{type:String},
    title:{type:String, required:true},
    message:{type:String, required:true},
    type:{type:String,
        enum: ["status", "schedule","sale"], 
        required:true
    },
    status:{
        type:String,
        enum:["unread","read"],
        default:"unread",
    },
    createdAt:{type:Date,default:Date.now}
})

const Notification = mongoose.model('Notification',notificationSchema);

module.exports = Notification;