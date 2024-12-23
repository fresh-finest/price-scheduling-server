const { text } = require("body-parser");
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller",
    required: true,
  },
  sellerMessage: { type: String, required: true },
  supportResponse:[
    {
     text:{type:String,required:true},
     timestamps: { type: Date, default: Date.now }
    }
  ],
  status:{type:String,enum:["pending","responded"], default:"pending"},
  createdAt:{type:Date,default:Date.now},
  updatedAt:{type:Date,default:Date.now},
},{timestamps:true});

const Message = mongoose.model("Message",messageSchema);
module.exports = Message;
