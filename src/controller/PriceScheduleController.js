const { createPriceScheduleService, getPriceScheduleService, getPriceScheduleServiceByAsin, getPriceScheduleServiceByUser, updatePriceScheduleServiceById, getPriceScheduleServiceId, deletePriceScheduleServiceById } = require("../service/PriceScheduleService")

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

exports.getPriceScheduleById = async(req,res,next)=>{
    try {
        const {id} = req.params;
        const result = await getPriceScheduleServiceId(id);
        res.status(200).json({
            status:"Success",
            message:"Successfully fetch data.",
            result,
        })
    } catch (error) {
        res.status(400).json({
            status:"Fail",
            message:"Couldn't fetch data.",
            error:error.message
        })
    }
}

exports.createPriceScheduleByAsin = async(req,res,next)=>{
    try {
    const {asin} = req.params;
    const result = await getPriceScheduleServiceByAsin(asin);
    res.status(200).json({
        status: "Success",
        message: "Successfully fetch data.",
        result,
      });
    } catch (error) {
        res.status(400).json({
            status: "Fail",
            message: "Couldn't fetch data.",
            error: error.message
        });
    }

}


exports.getPriceScheduleByUser = async(req,res,next)=>{
    try {
        const {userName} = req.params;
        const result = await getPriceScheduleServiceByUser(userName);
        res.status(200).json({
            status:"Success",
            message:"Successfully fetch data.",
            result,
        })
    } catch (error) {
        res.status(400).json({
            status:"Fail",
            message:"Couldn't fetch data.",
            error:error.message
        })
    }
}


exports.updatePriceScheduleById = async(req,res,next)=>{
    try {
        const {id}= req.params;
        const result = await updatePriceScheduleServiceById(id,req.body);

        res.status(200).json({
            status:"Success",
            message:"Successfuly updated data.",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Fails",
            message:"Couldn't updated schdeule",
            error:error.message
        })
    }
}

exports.deletePriceScheduleById = async(req,res,next)=>{
    try {

        const {id} = req.params;
        
        await deletePriceScheduleServiceById(id);

        res.status(200).json({
            status:"Success",
            message:"Successfully deleted data.",
        })
        
    } catch (error) {
        res.status(400).json({
            status:"Fails",
            message:"Couldn't deleted data",
            error:error.message
        })
    }
}