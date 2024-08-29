const mongoose = require('mongoose');

const priceScheduleSchema = mongoose.Schema({
  userName: { type: String },
  asin: { type: String },
  sku: { type: String },
  title: { type: String },
  price: { type: Number },
  currentPrice: { type: Number },
  imageURL: { type: String },
  firstChange: { type: Boolean, default: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: false },
  weekly: { type: Boolean, default: false }, // New field to indicate if this is a weekly schedule
  daysOfWeek: [{ type: Number }], // New field to store the selected days of the week (0 = Sunday, 6 = Saturday)
  status: { type: String, enum: ['created', 'updated', 'deleted'], default: 'created' }, // Field for status
}, { timestamps: true });

const PriceSchedule = mongoose.model("Schedule", priceScheduleSchema);
module.exports = PriceSchedule;
