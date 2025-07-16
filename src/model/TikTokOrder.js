const mongoose = require("mongoose");

const tikTokSchema = mongoose.Schema(
  {
    OrderId: {
      type: String,
      required: true,
      unique: true,
    },
    shipped_at: { type: String },
    created_at: { type: String },
    carrier_name: { type: String },
    customerName: { type: String },
    address: { type: String },
    trackingNumber:[ { type: String }],
    tags: [{ name: String }],
    channelCode: { type: String ,default:"tiktok"},
    channelName: { type: String,default:"tiktok" },
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

const TikTokOrder = mongoose.model("TikTokOrder", tikTokSchema);
module.exports = TikTokOrder;
