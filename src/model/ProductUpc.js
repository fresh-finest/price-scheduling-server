const mongoose = require("mongoose");

const productUpcSchema = mongoose.Schema({
product:{type:String},
upc:{type:String},
qty:{type:Number}
});

const ProductUpc = mongoose.model("ProductUpc", productUpcSchema);

module.exports = ProductUpc;
