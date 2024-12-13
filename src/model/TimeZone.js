const { mongoose } = require("mongoose");


const timeZoneSchema = new mongoose.Schema({
    timeZone:{
        type:String,
        default:"America/New_York"
    }
})

const TimeZone = mongoose.model("TimeZone",timeZoneSchema);
module.exports = TimeZone;

