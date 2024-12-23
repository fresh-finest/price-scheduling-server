const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
    {
      sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      amount: { type: Number, required: true, default: 0 }, 
      paymentDueDate: { type: Date, required: true },
      trial: { type: Boolean, default: false },
      status: { type: String, required: true, enum: ['active', 'cancelled', 'expired'], default: 'active' },
    },
    { timestamps: true }
  );
  

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;