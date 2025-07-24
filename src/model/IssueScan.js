const mongoose = require("mongoose");

// Counter schema (for generating incremental caseId)
const counterSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 1000 },
});
const Counter = mongoose.model("Counter", counterSchema);

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

// Auto-generate caseId before save
issuScanSchema.pre("save", async function (next) {
  if (this.isNew && !this.caseId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { id: "issueScan_caseId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.caseId = counter.seq.toString(); // store as string
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const IssueScan = mongoose.model("IssueScan", issuScanSchema);
module.exports = IssueScan;
