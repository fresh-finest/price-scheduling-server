const mongoose = require('mongoose');

const timeSlotSchema = mongoose.Schema({
  startTime: {type: String},
  endTime:{type:String},
  newPrice:{type:Number},
  revertPrice:{type:Number},
  timeSlotScheduleId: mongoose.Schema.Types.ObjectId,
},{_id:false});

const priceScheduleSchema = mongoose.Schema({
  userName: { type: String },
  asin: { type: String },
  sku: { type: String },
  title: { type: String },
  price: { type: Number },
  currentPrice: { type: Number },
  imageURL: { type: String },
  firstChange: { type: Boolean, default: true },
  startDate: { type: Date, required: false },
  endDate: { type: Date, required: false },
  weekly: { type: Boolean, default: false }, 
  // daysOfWeek: [{ type: Number }], 
  weeklyTimeSlots:{
    type: Map,
    of:[timeSlotSchema],
    default:{}
  },
  monthly: {type: Boolean,default: false},
  // datesOfMonth: [{type:Number}],
  monthlyTimeSlots:{
    type:Map,
    of:[timeSlotSchema],
    default:{}
  },
  timeZone: { 
    type: String, 
    default: 'UTC' // Default to UTC if no time zone is provided
  },
  status: { type: String, enum: ['created', 'updated', 'deleted'], default: 'created' }, // Field for status
}, { timestamps: true });

const PriceSchedule = mongoose.model("Schedule", priceScheduleSchema);
module.exports = PriceSchedule;