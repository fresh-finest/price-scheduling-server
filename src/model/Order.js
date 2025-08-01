const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    OrderId: {
      type: String,
      required: true,
      unique: true,
    },
    tiktokId:{type:String},
    id: { type: String },
    shipped_at: { type: String },
    created_at: { type: String },
    carrier_name: { type: String },
    customerName: { type: String, trim: true },
    address: { type: String, trim: true },
    trackingNumber: [{ type: String }],
    trackingUrl: { type: String },
    shipmentId: { type: String },
    tags: [{ name: String }],
    channelCode: { type: String },
    channelName: { type: String },
    warehouseId:{type:String},
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

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
