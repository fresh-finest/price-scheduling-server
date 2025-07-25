const mongoose = require("mongoose");

// Counter schema (for generating incremental caseId)


// Main IssueScan schema
const issuScanSchema = mongoose.Schema(
  {
    caseId: { type: String },
    OrderId: { type: String }, 
    items: [
      {
        sku: { type: String },
        quantity: { type: Number },
        title: { type: String },
        image: { type: String },
      },
    ],
    products: [
      {
        sku:{type:String},
        product: { type: String },
        upc: { type: String },
        qty: { type: Number },
        stock:{type:Boolean,default:true}
      },
    ],
    trackingNumber: [{ type: String }],
    issue: { type: Boolean, default: false },
    resolved: { type: Boolean, default: false },
    whNote: { type: String },
    note: { type: String },
    status: { type: String },
    whUser: { type: String },
    officeUser: { type: String },
    whDate: {type:Date},
    officeDate:{type:Date}

  },
  { timestamps: true }
);


const IssueScan = mongoose.model("IssueScan", issuScanSchema);
module.exports = IssueScan;
