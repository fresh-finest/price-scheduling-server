const mongoose = require("mongoose");
const ownerDb = require("../config/db");

const ownerNotificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['new_subscription', 'cancellation', 'payment_deadline']
    },
    message: {
        type: String,
        required: true
    },
    receiver: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Ownernotification = ownerDb.model('Ownernotification', ownerNotificationSchema);

module.exports = Ownernotification;
