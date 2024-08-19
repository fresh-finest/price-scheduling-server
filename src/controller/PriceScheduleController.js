const { createPriceScheduleService, getPriceScheduleService } = require("../service/PriceScheduleService")

exports.createPriceSchedule = async(req,res,next)=>{
    try {
        const result = await createPriceScheduleService(req.body);

        res.status(201).json({
            status:"Success",
            message:"Success fully scheduled",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Fails",
            message:"Couldn't add products",
            error:error.message   
        })
    }
}


// exports.getPriceSchedule = async(req,res,next)=>{
//     try {
//         const result = await getPriceScheduleService();

//         res.status(200).json({
//             status:"Success",
//             message:"Get Schedule",
//             result,
//         })
//     } catch (error) {
//         res.status(400).json({
//             status:"Fails",
//             message:"Couldn't fetch data",
//             error:error.message   
//         })
//     }
// }


// exports.getPriceSchedule = async (req, res, next) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const result = await getPriceScheduleService({ startDate, endDate });

//         res.status(200).json({
//             status: "Success",
//             message: "Get Schedule",
//             result,
//         });
//     } catch (error) {
//         res.status(400).json({
//             status: "Fail",
//             message: "Couldn't fetch data",
//             error: error.message
//         });
//     }
// };

exports.getPriceSchedule = async (req, res, next) => {
    try {
        const { startDate } = req.query;

        const result = await getPriceScheduleService({ startDate });

        res.status(200).json({
            status: "Success",
            message: "Get Schedule",
            result,
        });
    } catch (error) {
        res.status(400).json({
            status: "Fail",
            message: "Couldn't fetch data",
            error: error.message
        });
    }
};
