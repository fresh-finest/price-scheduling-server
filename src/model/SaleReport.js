
const mongoose = require('mongoose');

const saleReportSchema = mongoose.Schema({
  sellerSku: { type: String, required: true, trim: true },
  itemName: { type: String, trim: true },
  fnSku: { type: String },
  price: { type: Number, default: 0 },
  imageUrl: { type: String, trim: true },
  itemIsMarketplace: { type: String, trim: true },
  asin1: { type: String, },
  fulfillmentChannel: { type: String, trim: true },
  status: { type: String, trim: true },
  quantity: { type: Number, default: 0 },
  fulfillableQuantity: { type: Number, default: 0 },
  pendingTransshipmentQuantity: { type: Number, default: 0 },
  isFavourite: { type: Boolean, default: false },
  isHide:{type:Boolean,default:false},
    salesMetrics: [
        {
          interval: { type: String },
          units: { type: Number },
          price:{ type: Number},
        },
      ],
},{timestamps: true}); 

const SaleReport = mongoose.model('SaleReport',saleReportSchema);

module.exports = SaleReport;
