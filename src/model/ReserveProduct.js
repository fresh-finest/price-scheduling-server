const mongoose = require("mongoose");

const reserveProduct = mongoose.Schema({
  sku: { type: String },
  products: [
    {
      product:{type:String},
      upc: {type:String},
      qty: {type:Number},
    },
  ],
});

const ReserveProduct = mongoose.model("ReserveProduct", reserveProduct);

module.exports = ReserveProduct;
