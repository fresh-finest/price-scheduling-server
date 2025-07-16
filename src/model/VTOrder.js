const mongoose = require("mongoose");

const vtSchema = mongoose.Schema(
  {
    OrderId: {
      type: String,
      required: true,
      unique: true,
    },
    id: { type: String },
    shipped_at: { type: String },
    created_at: { type: String },
    carrier_name: { type: String },
    customerName: { type: String },
    address: { type: String },
    trackingNumber:[ { type: String }],
    trackingUrl: { type: String },
    shipmentId: { type: String },
    tags: [{ name: String }],
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


const VTOrder = mongoose.model("VTOrder", vtSchema);
module.exports = VTOrder;
