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
