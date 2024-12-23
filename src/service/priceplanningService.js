const Pricingplan = require("../model/Pricingplan")


exports.createPricePlanService = async(data)=>{
    const price = await Pricingplan.create(data);
    return price;
}


exports.getPricePlanService = async()=>{

    const result = await Pricingplan.find().sort({updatedAt:-1});
    return result;
}

exports.getPricingPlansByProductService = async(product)=>{
    const result = await Pricingplan.find({product});
    return result;
}


exports.updatePricingPlanService = async(id, updates)=>{
    return await Pricingplan.findByIdAndUpdate(id,updates,{new:true,runValidators:true});
}


exports.deletePricingPlanService = async(id)=>{
    return await Pricingplan.findByIdAndDelete(id);
}

