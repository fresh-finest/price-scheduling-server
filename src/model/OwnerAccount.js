
const mongoose = require("mongoose");
const ownerDb = require("../config/db");

const ownerAccountSchema = mongoose.Schema({
    userId:{
        type:String
    },
    db:[
        {
            dbName:{type:String},
            marketplace_id: {type:String},
            currency:{type:String},
            timeZone:{type:String}
        }
    ]
})

const OwnerAccount = ownerDb.model("OwnerAccount",ownerAccountSchema);
module.exports = OwnerAccount;