const mongoose = require('mongoose');

const deletedPriceScheduleSchema = mongoose.Schema({
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to the original schedule ID
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
  deletedAt: { type: Date, default: Date.now }, // Timestamp when the schedule was deleted
}, { timestamps: true });

const DeletedPriceSchedule = mongoose.model("DeletedPriceSchedule", deletedPriceScheduleSchema);
module.exports = DeletedPriceSchedule;
