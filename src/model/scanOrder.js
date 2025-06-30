const mongoose = require('mongoose');

const scanOrderSchema = mongoose.Schema({
  pickerName:{type:String},
  packerName: { type: String },
  pickerRole: { type: String},
  packerRole: { type: String},
  orderId: { type: String, required: true, unique: true },
  trackingNumber: { type: String, required: true, unique: true },
  picked: { type: Boolean, default: false },
  packed: { type: Boolean, default: false },
  scanStatus: { type: String, default: "pending" },
}, { timestamps: true });

const ScanOrder = mongoose.model('ScanOrder', scanOrderSchema);
module.exports = ScanOrder;
