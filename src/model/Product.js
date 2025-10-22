const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    itemName: { type: String, trim: true },
    itemDescription: { type: String, trim: true },
    sellerSku: { type: String, required: true, trim: true },
    fnSku: { type: String },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    imageUrl: { type: String, trim: true },
    asin1: { type: String, required: true, trim: true },
    fulfillmentChannel: { type: String, trim: true },
    status: { type: String, trim: true },
    fulfillableQuantity: { type: Number, default: 0 },
    pendingTransshipmentQuantity: { type: Number, default: 0 },
    tags: [
      {
        tag: { type: String },
        colorCode: { type: String },
      },
    ],
    groupName: [
      {
        name: { tapye: String },
      },
    ],
    salesMetrics: [
      {
        time: { type: String, required: true },
        totalUnits: { type: Number, required: true },
        totalSalesAmount: { type: String, required: true },
      },
    ],

    offerPrice:{type:String},
    buybox:{type:Boolean},
    isFavourite: { type: Boolean, default: false },
    isHide: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
