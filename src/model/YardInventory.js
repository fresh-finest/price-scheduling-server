
const mongoose = require("mongoose");

const YardInventorySchema = new mongoose.Schema(
  {
    snapshotDate: {
      type: String, // YYYY-MM-DD (UTC)
      index: true,
      required: true,
    },
    itemName: { type: String, index: true, required: true },
    title: { type: String, default: "" },
    brand: { type: String, default: "" },
    qtyOnHand: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

// Prevent duplicates per day.
YardInventorySchema.index({ itemName: 1, snapshotDate: 1 }, { unique: true });

module.exports = mongoose.model("YardInventory", YardInventorySchema);
