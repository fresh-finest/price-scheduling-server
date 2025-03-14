
const mongoose = require('mongoose');

const totalSaleSchema = new mongoose.Schema({
    interval:{type:String},
    unitCount: Number,
    orderItemCount: Number,
    orderCount: Number,
    averageUnitPrice:{
        amount:Number,
        currencyCode:String
    },
    totalSales:{
        amount:Number,
        currencyCode:String,
    }
},{timestamps:true});

module.export = mongoose.model('TotalSale',totalSaleSchema);

