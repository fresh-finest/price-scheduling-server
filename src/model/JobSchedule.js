const mongoose = require('mongoose');

const jobScheduleSchema = mongoose.Schema({
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

const JobSchedule = mongoose.model("Schedule", jobScheduleSchema);
module.exports = JobSchedule;