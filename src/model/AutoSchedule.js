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
   
    maxUnit:{
        type:Number,
        min:0
    },
    Prices:[Number],
    maxPrice:{
        type:Number
    },
    minPrice:{
        type:Number,
    },
    randomPrice:{
        type:Number,
    },
    startDate:{
        type: Date,
    },
    endDate:{
        type: Date
    },
    executionDateTime:{
        type:Date
    },
    status:{
        type:String
    }
},{ timestamps: true })

const AutoSchedule = mongoose.model('AutoSchedule', autoScheduleSchema);

module.exports = AutoSchedule;