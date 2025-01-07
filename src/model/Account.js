const mongoose = require("mongoose");

const accountSchema = mongoose.Schema(
  {
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    profile: {
      type: String,
    },
    MARKETPLACE_ID: {
      type: String,
    },
  },
  { timestamps: true }
);

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;
