

const mongoose = require('mongoose')

const WarehouseSchema = mongoose.Schema({
    WareHouseId: Number,
    locationId:Number,
    WarehouseName: String,
    LocationCode: String,
    ItemCount: Number,
    Qty:Number,
    LastUpdate: String,
    FBMEnabled: String,
    TotalValue: Number,
    WId: String,
    Note:String,
    Items: String, 
    isOutOfStock:Boolean,
    uploadedAt:{type:Date, default:Date.now},
    batchId: String,
    isLatest: Boolean,
})

module.exports = mongoose.model('Warehouse', WarehouseSchema);