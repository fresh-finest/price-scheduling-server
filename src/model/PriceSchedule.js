const mongoose = require('mongoose');

const priceScheduleSchema = mongoose.Schema({
  userName:{type: String},
  asin:{type: String},
  sku: { type: String },
  title:{type:String},
  price: { type: Number },
  currentPrice: {type:Number},
  imageURL:{type: String},
  firstChange:{type: Boolean, default:true},
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: false },
}, { timestamps: true })

const PriceSchedule = mongoose.model("Schedule", priceScheduleSchema);
module.exports = PriceSchedule;