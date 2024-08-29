const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PriceSchedule' },
  action: { type: String, enum: ['created', 'updated', 'deleted'] },
  previousState: { type: Object },  // Used to store previous state during updates or deletes
  updatedState: { type: Object },   // Used during updates
  userName: { type: String },
  asin: { type: String },
  sku: { type: String },
  title: { type: String },
  price: { type: Number },
  currentPrice: { type: Number },
  imageURL: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  timestamp: { type: Date, default: Date.now },
  weekly: { type: Boolean, default: false }, 
  daysOfWeek: [{ type: Number }], 
}, { timestamps: true });

const History = mongoose.model('History', historySchema);
module.exports = History;
