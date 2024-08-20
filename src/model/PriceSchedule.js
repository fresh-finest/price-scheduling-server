const mongoose = require('mongoose');

const priceScheduleSchema = mongoose.Schema({
  userName:{type: String},
  asin:{type: String},
  sku: { type: String },
  price: { type: Number },
  currentPrice: {type:Number},
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: false },
})

const PriceSchedule = mongoose.model("Schedule", priceScheduleSchema);
module.exports = PriceSchedule;