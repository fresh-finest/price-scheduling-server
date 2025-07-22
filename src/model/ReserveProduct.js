const mongoose = require("mongoose");


const reserveProduct = mongoose.Schema({
    sku:{type:String},
    product:{type:String},
    upc:{type:String},
    image:{type:String},
    qty:{type:Number},
    
});

const ReserveProduct = mongoose.model("ReserveProduct",reserveProduct);

module.exports = ReserveProduct;