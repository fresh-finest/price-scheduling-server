const mongoose = require('mongoose');

const priceScheduleSchema = mongoose.Schema({
  asin:{type: String},
  sku: { type: String },
  price: { type: Number },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
})

const PriceSchedule = mongoose.model("Schedule", priceScheduleSchema);
module.exports = PriceSchedule;