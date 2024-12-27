const { unique } = require("agenda/dist/job/unique");
const mongoose = require("mongoose");

const activeAutoJobSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique:true,
  },
  asin:{
    type:String,
  },
  rule:{
    type:String,
  },
  title: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  category: {
    type: String,
  },
  maxPrice: {
    type: Number,
    required: true,
  },
  minPrice: {
    type: Number,
    required: true,
  },
  currentPrice: {
    type: Number,
  },
  percentage:{
    type:Number
  },
  amount:{
    type:Number
  },
  userName: {
    type: String,
  },
  interval: {
    type: String,
  },
  startAt:{
    type:Date
  },
  endAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["created", "updated", "deleted"],
    default: "created",
  },
},{ timestamps: true });

const ActiveAutoJob = mongoose.model("ActiveAutoJob", activeAutoJobSchema);

module.exports = ActiveAutoJob;
