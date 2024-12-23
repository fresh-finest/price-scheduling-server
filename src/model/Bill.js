
const { Timestamp } = require('bson');
const mongoose = require('mongoose');


const billSchema = new mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seller",
        required: true
    },
    amount:{
        type:Number,
        required:true
    },
    description:{
        type: String
    },
    status:{
        type:String,
        enum:["paid","unpaid"], default:"unpaid"
    },
    dueDate:{
        type:Date,
        required:true
    },
    createdAt:{type:Date, default:Date.now},
}, {timestamps:true});

const Billing = mongoose.model("Billing", billSchema);

module.exports = Billing;