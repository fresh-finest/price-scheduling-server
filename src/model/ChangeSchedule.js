const mongoose = require('mongoose');

const changeScheduleschema = new mongoose.Schema({
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  userName: { type: String, required: true },
  field: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed, required: true },
  newValue: { type: mongoose.Schema.Types.Mixed, required: true },
  changedAt: { type: Date, default: Date.now },
});

const ChangeSchedule = mongoose.model('ChangeSchedule', changeScheduleschema);

module.exports = ChangeSchedule;
