// models/TikTokAuth.js
const mongoose = require('mongoose');

const TikTokAuthSchema = new mongoose.Schema({
  open_id: {
    type: String,
    unique: true,
  },
  seller_name: String,
  access_token: String,
  refresh_token: String,
  access_token_expire_at: Date,
  refresh_token_expire_at: Date,
  shop_region: String,
  locale: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('TikTokAuth', TikTokAuthSchema);
