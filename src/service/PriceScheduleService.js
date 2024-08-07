const PriceSchedule = require("../model/PriceSchedule")

exports.createPriceScheduleService = async(data)=>{
    const schedule = await PriceSchedule.create(data);
    return schedule;
}

exports.getPriceScheduleService = async()=>{
    const result = await PriceSchedule.find({});
    return result;
}