const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: true,
    },
    itemName: {
        type: String,
    },
    imageUrl: {
        type: String,
    },
    weekly: {
        type: Boolean,
    },
    monthly: {
        type: Boolean,
    },
    interval: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
    },
    unitCount: {
        type: Number,
    },
    dayOfWeek: {
        type: Number, // Day of the week (0-6) for weekly schedules
    },
    dateOfMonth: {
        type: Number, // Day of the month (1-31) for monthly schedules
    },
    scheduleType: {
        type: String, // 'single', 'weekly', or 'monthly'
        required: true,
    },
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
