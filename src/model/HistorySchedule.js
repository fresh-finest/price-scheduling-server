const mongoose = require('mongoose');
const timeSlotSchema = mongoose.Schema({
  startTime: {type: String},
  endTime:{type:String},
  newPrice:{type:Number},
  revertPrice:{type:Number},
  scheduleId: mongoose.Schema.Types.ObjectId,
},{_id:false});

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
  // startTime:{type:String},
  // endTime:{type:String}
}, { timestamps: true });

const History = mongoose.model('History', historySchema);
module.exports = History;