const moment = require('moment'); 

const AutoSchedule = require("../../model/AutoSchedule");
const { autoJobsAgenda } = require("../Agenda");
const updateProductSalePrice = require("../UpdatePrice/UpdateSalePrice");
const generatePrice = require('../oboService/generatePrice');
const updateProductPrice = require('../UpdatePrice/UpdatePrice');

const reinitializeAutoJobs = async () => {
    try {
      const autoJobs = await autoJobsAgenda.jobs({});  
     
      autoJobs.forEach((job) => {
        const { name, data } = job.attrs;
       
        autoJobsAgenda.define(name, async (job) => {
          
          const { sku,minPrice,maxPrice, startDate,endDate,percentage,amount,category,sale,targetQuantity} = job.attrs.data;
          // const randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
          const randomPrice = await generatePrice(sku,maxPrice,minPrice,percentage,amount,category,targetQuantity);
        
          try {
            if (name.startsWith(`UpdateAutoPriceChange ${sku}`)) {
              console.log(sale);
              if(sale){
                await updateProductSalePrice(sku, parseFloat(randomPrice), startDate,endDate);
              }else{
                await updateProductPrice(sku,parseFloat(randomPrice))
              }
              
              console.log(`Auto Price updated: ${sku} price: ${randomPrice}`);
            } 
          } catch (error) {
            console.error(`Failed to process job ${name} for SKU: ${sku}`, error);
          }
          const executionDateTime = moment().format('YYYY-MM-DD HH:mm');
          const executionRecord = {
            sku,
            maxPrice,
            minPrice,
            randomPrice,
            startDate,
            endDate,
            executionDateTime,
            targetQuantity
        }

        console.log(executionDateTime);
        await AutoSchedule.create(executionRecord);
          job.attrs.data.randomPrice = randomPrice;
          await job.save();
        });
      });
  
      
    } catch (error) {
      console.error('Failed to fetch jobs from the database', error);
    }
  };

  
  module.exports = reinitializeAutoJobs;