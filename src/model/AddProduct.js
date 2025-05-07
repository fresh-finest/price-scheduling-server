

const mongoose = require("mongoose");

const addProductSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: true,
        unique:true,
    },
    asin:{
        type:String,
    },
    title: {
        type: String,
    },
    imageUrl: {
        type: String,
    },
   maxPrice:{
    type:Number,
    required:true
   },
   minPrice:{
    type:Number,
    required:true
   },
   targetQuantity:{
    type:Number,
   },
   sale:{
    type:Boolean,
    default:false
   },
    status: {
        type: String,
        enum: ["Active", "Inactive", "deleted"],
        default: "Active",
    },
    ruleId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Rule",
        required:true
    }
    },{ timestamps: true });


const AddPoduct = mongoose.model("AddProduct", addProductSchema);

module.exports = AddPoduct;
