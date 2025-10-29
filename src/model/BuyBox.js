const mongoose = require("mongoose");
const { seller_id } = require("../middleware/credentialMiddleware");


const buyBoxSchema = new mongoose.Schema({
    asin:{
        type:String
    },
    sku:{
        type:String
    },
    title:{
        type:String
    },
    image:{
        type:String
    },
    landedPrice:{
        type:String
    },
    competitivePrice:{
        type:String
    },
    fresFinest:[
       {
         seller_id:{type:String},
         IsBuyBox:{type:Boolean},
         listingPrice:{type:String},
       }
    ],
    otherSeller:[
        {
            seller_id:{type:String},
            IsBuyBox:{type:Boolean},
            listingPrice:{type:String}
        }
    ]
})

const BuyBox = mongoose.model("BuyBox",buyBoxSchema);

module.exports = BuyBox;
