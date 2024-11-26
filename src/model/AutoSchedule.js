const { mongoose } = require("mongoose");



const autoScheduleSchema =  new mongoose.Schema({
    itemName:{
        type:String
    },
    sku:{
        type:String
    },
    asin:{
        type:String
    },
    imageUrl:{
        type:String,
    },
    price:{
        type:Number,
    },
    maxUnit:{
        type:Number,
        min:0
    },
    maxPrices:[Number],
    status:{
        type:String
    }
},{ timestamps: true })

const AutoSchedule = mongoose.model('AutoSchedule', autoScheduleSchema);

module.exports = AutoSchedule;