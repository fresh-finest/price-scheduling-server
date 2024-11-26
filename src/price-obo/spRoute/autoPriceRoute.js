const express = require('express');
const router = express.Router();
const AutoPricingJob = require("../JobSchedule/AutoPricingJob");


router.post(`/auto-pricing`,async(req,res)=>{
    const {sku,maxPrice,minPrice} = req.body;
    console.log(req.body);
    try {

        await AutoPricingJob(sku,maxPrice,minPrice);

        res.status(200).json({
            message:`Auto-pricing job for sku: ${sku} scheduled successfully!`,
        })
    } catch (error) {
        res.status(500).json({
            error:'Failed to auto schduling',
            details:error.message
        })
    }
})


module.exports = router;