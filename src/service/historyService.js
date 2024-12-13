const moment = require("moment");
const History = require("../model/HistorySchedule");


exports.searchHistoryBySkuAsinService = async(sku,asin)=>{
    const query = {};
    console.log(sku);
    if(sku) query.sku = sku;
    if(asin) query.asin = asin;

    const histories = await History.find(query);
    return histories;
}


exports.filterHistoryByDateRangeService = async(startDate,endDate,weekly,monthly)=>{
    try {
        const start =  moment(startDate,"YYYY-MM-DD").startOf("day");
        const end = moment(endDate,"YYYY-MM-DD").endOf("day");

        const filteredHistories = await History.find({
            startDate:{$gte:start.toDate(),$lte:end.toDate()},
        })

        const weeklySchedules = weekly ? await History.find({
            action:"weekly"
        }):[];
        const monthlySchedules = monthly? await History.find({
            action:"monthly"
        }):[];

        return{
            filteredHistories,
            weeklySchedules,
            monthlySchedules
        }
    } catch (error) {
        throw new Error("Error filtering by date range"+error.message);
    }
}

exports.filterHistoriesByTypeService = async(type)=>{
    try {
        let query = {};
        if(type === "weekly"){
            query = {weekly:true};
        }else if(type==="monthly"){
            query = {monthly:true, weekly: {$ne: true}};
        } else if(type === "single"){
            query = {weekly: false,monthly:false};
        }
    } catch (error) {
        
    }
}