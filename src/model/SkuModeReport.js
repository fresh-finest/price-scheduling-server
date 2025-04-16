
const mongoose = require("mongoose");


const skuModeReportSchema =  new mongoose.Schema({
    sellerSku: { type: String, required: true, trim: true },
    itemName: { type: String, trim: true },
    fnSku: { type: String },
    price: { type: Number, default: 0 },
    imageUrl: { type: String, trim: true },
    itemIsMarketplace: { type: String, trim: true },
    asin1: { type: String, },
    percentageChange: { type: Number, default: 0 },
    currentUnits:{ type: Number, default: 0 },
    previousUnits:{ type: Number, default: 0 },
    fulfillmentChannel: { type: String, trim: true },
    status: { type: String, trim: true },
    quantity: { type: Number, default: 0 },
    fulfillableQuantity: { type: Number, default: 0 },
    pendingTransshipmentQuantity: { type: Number, default: 0 },
    isFavourite: { type: Boolean, default: false },
    isHide:{type:Boolean,default:false},
    
  },{timestamps: true}); 

module.exports = mongoose.model('SkuModeReport',skuModeReportSchema);

