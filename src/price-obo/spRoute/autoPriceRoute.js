const express = require('express');
const router = express.Router();
const AutoPricingJob = require("../JobSchedule/AutoPricingJob");
const AutoSchedule = require('../../model/AutoSchedule');
const axios = require('axios');
const AutoPriceReport = require('../../model/AutoPriceReport');
const processAndStoreData = require('../oboService/automationReportService');
// const processAndStoreData = require('../../service/AutoPriceReportService');

router.get("/auto-pricing-report", async (req, res) => {
    console.log("Endpoint '/auto-pricing-report' hit.");
    try {
        const autoScheduleResponse = await axios.get(`http://localhost:3000/auto-schedule`);

        const result = await processAndStoreData(autoScheduleResponse);
        res.status(200).json({
            message: "Auto-pricing report processed successfully.",
            result,
        });
    } catch (error) {
        console.error("Error in /auto-pricing-report:", error.message);
        res.status(500).json({
            error: "Failed to process and store data",
            details: error.message,
        });
    }
});

router.get("/auto-report/:sku",async(req,res)=>{
    const {sku} = req.params;
    try {
        const result = await AutoPriceReport.find({sku:sku});
        res.status(200).json({
            status:"Success",
            message:"successfully get auto report",
            result
        })
    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message:"Failed fetch data",
            error:error.message
        })
    }
})
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

router.get(`/auto-schedule`, async (req, res) => {
    try {

      const result = await AutoSchedule.find({});
      res.status(200).json({
        message: "Successfully retrieved autoschedule data.",
        result,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to load autoschedule data.",
        error: error.message,
      });
    }
  });
  

 

module.exports = router;