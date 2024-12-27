const express = require('express');
const router = express.Router();
const AutoPricingJob = require("../JobSchedule/AutoPricingJob");
const AutoSchedule = require('../../model/AutoSchedule');
const axios = require('axios');
const AutoPriceReport = require('../../model/AutoPriceReport');
const processAndStoreData = require('../oboService/automationReportService');
const { autoJobsAgenda } = require('../Agenda');
const ActiveAutoJob = require('../../model/ActiveAutoJob');
const Rule = require('../../model/Rule');
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
    const {sku,maxPrice,minPrice,percentage,amount,category,interval} = req.body;
    console.log("req body",req.body);
    try {

        await AutoPricingJob(sku,maxPrice,minPrice,percentage,amount,category,interval);
        // await ActiveAutoJob.create(req.body);

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

router.post('/auto-rule',async(req,res)=>{
    try {
        const rules = await Rule.create(req.body);

        res.status(200).json({
            message:"Successfully created rule",
            rules
        })
    } catch (error) {
        res.status(400).json({
            error:"Failed to create rule",
            details:error.message
        })
    }
})

router.get('/auto-rule',async(req,res)=>{
    try {
        const rules = await Rule.find();
        res.status(200).json({
            message:"Successfully get rules",
            rules
        })
    } catch (error) {
        res.status(400).json({
            error:"Failed to get rules",
            details:error.message
        })
    }
})   

router.get('/auto-rule/:ruleId',async(req,res)=>{    
    const {ruleId} = req.params;
    try {
        const rule = await Rule.findOne({ruleId});
        res.status(200).json({
            message:"Successfully get rule",
            rule
        })
    } catch (error) {
        res.status(400).json({
            error:"Failed to get rule",
            details:error.message
        })
    }
});

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


  router.get("/api/active-auto-job", async(req,res)=>{
    try {
        const result = await ActiveAutoJob.find();
        res.status(200).json({result});
    } catch (error) {
        res.status(500).json({error:error.message});
    }
  })


  router.get("/api/active-auto-job/rule",async(req,res)=>{
    try {
        const jobs = await ActiveAutoJob.find({}, {rule:1,_id:0});

        const uniqueRules = [...new Set(jobs.map(job=>job.rule))];
        res.status(200).json({
            rules:uniqueRules
        })
    } catch (error) {
        res.status(500).json({error:error.message});
    }
  })

  router.get("/api/active-auto-job/:rule",async(req,res)=>{
    const {rule} = req.params;
    try {
    
        const jobs = await ActiveAutoJob.find({rule});
        res.status(200).json({jobs});
    } catch (error) {
        res.status(500).json({error:error.message});
    }
  })

  router.get("/api/active-auto-job/:sku/sku",async(req,res)=>{
    const {sku} = req.params;
    try {
        const job = await ActiveAutoJob.findOne({sku});
        res.status(200).json({job});    
    } catch (error) {       
        res.status(500).json({error:error.message});
    }           
    })
  router.put("/api/active-auto-job/:sku",async(req,res)=>{
    const {sku} = req.params;
    const {maxPrice,minPrice} = req.body;
 
        try {
            autojob = await ActiveAutoJob.findone({sku});
            if(!autojob){
                return res.status(404).json({error:"Active jobs is not found"});
            }
            autoJob.maxPrice = maxPrice;
            autoJob.minPrice = minPrice;
            autojob.status = "updated";

            await ActiveAutoJob.save();

            await autoJobsAgenda.cancel({'data.sku':sku})

            await AutoPricingJob(sku,maxPrice,minPrice);
    
            res.status(200).json({message:"Successfully updated."})
        } catch (error) {
            
           res.status(400).json({error:error.message});
        }
   
  });

  router.delete("/api/active-auto-job/:sku",async(req,res)=>{
    const {sku} = req.params;
    try {
        const autojob = await ActiveAutoJob.findOne({sku});

        if(!autojob){
            return res.status(404).json({error:"auto job is not found"})
        }

        autojob.status ="deleted";

        await autoJobsAgenda.cancel({'data.sku':sku});
        res.status(200).json({message:"successfully deleted!"})
    } catch (error) {
        res.status(500).json({error:error.message});
    }
  })



module.exports = router;