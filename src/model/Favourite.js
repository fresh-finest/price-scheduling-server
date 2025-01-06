const mongoose = require("mongoose");

const favouriteSchema = new mongoose.Schema({
  itemName: { type: String, trim: true },
  sellerSku: { type: String, required: true, trim: true },
  fnSku: { type: String },
  price: { type: Number, default: 0 },
  imageUrl: { type: String, trim: true },
  itemIsMarketplace: { type: String, trim: true },
  asin1: { type: String, required: true, trim: true },
  fulfillmentChannel: { type: String, trim: true },
  status: { type: String, trim: true },
  fulfillableQuantity: { type: Number, default: 0 },
  pendingTransshipmentQuantity: { type: Number, default: 0 },
  isFavourite: { type: Boolean, default: false },
  isHide:{type:Boolean,default:false},
});

const Favourite = mongoose.model("Favourite", favouriteSchema);
module.exports = Favourite;
