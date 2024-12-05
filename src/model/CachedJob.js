const { default: mongoose } = require("mongoose");

const cachedJobSchema = new mongoose.Schema({
    name:String,
    nextRunAt:Date,
    lastRunAt:Date,
    failCount:Number,
    price: { type: Number, required: true },
    data: {
        sku: { type: String, required: true },
        price: { type: Number, required: false },
        scheduleId: { type: mongoose.Schema.Types.ObjectId, required: true },
    },
    updatedAt:{type:Date, default:Date.now}
})

const CachedJob = mongoose.model('CachedJob',cachedJobSchema);
module.exports = CachedJob;