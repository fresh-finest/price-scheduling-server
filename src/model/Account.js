const mongoose = require('mongoose');

const accountSchema = mongoose.Schema({
    MARKETPLACE_ID:{
        type:String,
        unique:true,
        required:true
    },

}, { timestamps: true });

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;