
const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema({
    product:{
        type:String,
        required:true,
        enum:["Pricing","Analytics","Automation","Shipment"],
    },
    duration:{
      type:String,
      required:true,
      enum:["1_month", "6_months","1_year"],
    },
    price:{
        type:Number,
        required:true
    },
    currency:{
        type:String,
        default:"USD"
    },
    isDynamic:{
        type:Boolean,
        default:false
    },
    updatedAt:{type:Date, default:Date.Now},

},{timsestamps:true});

const Pricingplan = mongoose.model("Pricingplan",pricingSchema);

module.exports = Pricingplan;