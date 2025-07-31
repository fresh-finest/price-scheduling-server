const mongoose = require('mongoose');

const trackScanSchema = mongoose.Schema({
  pickerName:{type:String},
  packerName: { type: String },
  paletterName:{type:String},
  pickerRole: { type: String},
  packerRole: { type: String},
  paletterRole:{type:String},
  orderId: { type: String, required: true, unique: true },
  trackingNumber:[ { type: String }],
  packedTrackingNumbers: [String],
  pickedTrackingNumbers: [String],
  palleteTrackingNumbers:[String],
  picked: { type: Boolean, default: false },
  packed: { type: Boolean, default: false },
  isPalette:{type: Boolean, default:false},
  pickedAt: { type: Date },
  packedAt: { type: Date },
  paletteAt:{type:Date},
  packedProduct: [String],
  packedUPC: [String],
  scanproductAt: { type: Date },
  scanStatus: { type: String, default: "pending" },
}, { timestamps: true });

const TrackScan = mongoose.model('TrackScan', trackScanSchema);
module.exports = TrackScan;
