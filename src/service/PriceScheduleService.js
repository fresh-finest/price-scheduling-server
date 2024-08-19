const PriceSchedule = require("../model/PriceSchedule")

exports.createPriceScheduleService = async(data)=>{
    const schedule = await PriceSchedule.create(data);
    return schedule;
}

// exports.getPriceScheduleService = async()=>{
//     const result = await PriceSchedule.find({});
//     return result;
// }

// exports.getPriceScheduleService = async({ startDate, endDate }) => {
//     let query = {};

//     if (startDate && endDate) {
//         // Filtering schedules where the selected date falls within the startDate and endDate range
//         query = {
//             $and: [
//                 { startDate: { $lte: new Date(endDate) } },
//                 { endDate: { $gte: new Date(startDate) } }
//             ]
//         };
//     }

//     const result = await PriceSchedule.find(query);
//     return result;
// };

exports.getPriceScheduleService = async({ startDate }) => {
    let query = {};

    if (startDate) {
        // Create date range for the entire day in the local timezone
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);  // Start of the selected day in local time

        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);  // End of the selected day in local time

        // Query for events that start within the selected date (local time)
        query = {
            startDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
    }

    const result = await PriceSchedule.find(query);
    return result;
};

