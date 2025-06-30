const mongoose = require('mongoose');

const scanOrderSchema = mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  trackingNumber: { type: String, required: true, unique: true },
  picked: { type: Boolean, default: false },
  packed: { type: Boolean, default: false },
  scanStatus: { type: String, default: "pending" },
}, { timestamps: true });

const ScanOrder = mongoose.model('ScanOrder', scanOrderSchema);
module.exports = ScanOrder;
