const { unique } = require("agenda/dist/job/unique");
const mongoose = require("mongoose");

const productGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    skus: [
      {
        sku: {
          type: String,
          
        },
        uom:{
            type:Number
        }
      },
    ],
    stocks: {
      type: Number,
    },
    price: {
      type: Number,
    },
    units: {
      type: Number,
    },
    cost:{
        type: Number
    },
    userName: {
      type: String,
    },
  },
  { timestamps: true }
);

const ProductGroup = mongoose.model("ProductGroup", productGroupSchema);

module.exports = ProductGroup;
