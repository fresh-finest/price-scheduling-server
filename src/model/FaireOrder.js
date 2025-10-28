const mongoose = require("mongoose");

const faireOrderSchema = new mongoose.Schema({
    OrderId: {
      type: String,
      required: true,
      unique: true,
    },
    id: { type: String },
    shipped_at: { type: String },
    created_at: { type: String },
    carrier_name: { type: String },
    customerName: { type: String, trim: true },
    address: { type: String, trim: true },
    trackingNumber:[ { type: String }],
    channelCode: { type: String },
    channelName: { type: String },
    items: [
      {
        sku: { type: String },
        quantity: { type: Number },
        title: { type: String },
        image: { type: String },
      },
    ],
    status: {
      type: String,
    },
  },
  { timestamps: true }
);

const FaireOrder = new mongoose.model("FaireOrder",faireOrderSchema);

module.exports = FaireOrder;
