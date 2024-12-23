const { createPricePlanService, getPricePlanService, updatePricingPlanService, getPricingPlansByProductService, deletePricingPlanService } = require("../service/priceplanningService");
const { errorHandler } = require("../utils/errorHandler");



exports.createPricePlan = async(req,res,next)=>{
    try {
        const result = await createPricePlanService(req.body);
        res.status(201).json({
            status:"Success",
            message:"Successfully pricing plan created.",
            result
        })
    } catch (error) {
        next(error);
    }
}

exports.getPricePlan = async(req,res,next)=>{
    try {
        const result = await getPricePlanService();
        res.status(200).json({
            status:"Success",
            message:"Successfully fetched pricing plan.",
            result
        })
    } catch (error) {
        next(error)
    }
}

exports.getPricingPlanByProduct = async(req,res,next)=>{
    try {
        const {product} = req.params;
        const result = await getPricingPlansByProductService(product);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

exports.updatePricingPlan = async(req,res,next)=>{
    try {
        const {id} = req.params;
        const updates = req.body;
        const result = updatePricingPlanService(id,updates);
        res.status(200).json({
            status:"Success",
            message:"Successfully updated pricing plan",
            result
        })
    } catch (error) {
        next(error);
    }
}

exports.deletePricingPlan = async(req,res,next)=>{
    try {
        const {id} = req.params;
        await  deletePricingPlanService(id);
        res.status(200).json({message:"Successfully deleted plan"});
    } catch (error) {
        next(errorHandler(500,"Failed to deleted plan."))
    }
}