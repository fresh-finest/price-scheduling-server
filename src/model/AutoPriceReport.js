const { default: mongoose } = require("mongoose");


const autoPriceReportSchema = new mongoose.Schema({

    sku:{
        type:String,
    },
    randomPrice:{
        type:Number,
    },
    executionDateTime:{
        type:Date
    },
    unitCount:{
        type:Number
    }

},{ timestamps: true })


const AutoPriceReport = mongoose.model('AutoPriceReport',autoPriceReportSchema);

module.exports  = AutoPriceReport;