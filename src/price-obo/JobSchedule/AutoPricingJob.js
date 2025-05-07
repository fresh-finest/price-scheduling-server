const moment = require('moment'); 
const { autoJobsAgenda } = require('../Agenda'); 

const updateProductSalePrice = require('../UpdatePrice/UpdateSalePrice');
const AutoSchedule = require('../../model/AutoSchedule');
const generatePrice = require('../oboService/generatePrice');
const updateProductPrice = require('../UpdatePrice/UpdatePrice');



async function defineAutopriceJob(sku, maxPrice, minPrice, startDate, endDate,percentage,amount,category,sale,targetQuantity) {
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm');
    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`;
   
    
    autoJobsAgenda.define(jobName, async (job) => {
        const { sku, maxPrice, minPrice, startDate, endDate,sale } = job.attrs.data;
        console.log("job data:"+JSON.stringify(job.attrs.data));
        const randomPrice = await generatePrice(sku,maxPrice,minPrice,percentage,amount,category,targetQuantity);
        
        // const randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
        console.log("price: "+randomPrice);
       
        const executionDateTime = moment().format('YYYY-MM-DD HH:mm');

        console.log(`Updating price for SKU: ${sku} to ${randomPrice}, Start Date: ${startDate}, End Date: ${endDate}`);
        console.log(sale);
        if(sale){
            await updateProductSalePrice(sku, parseFloat(randomPrice), startDate, endDate);
        }else{
           await updateProductPrice(sku,parseFloat(randomPrice))
        }
      
        const executionRecord = {
            sku,
            maxPrice,
            minPrice,
            randomPrice,
            startDate,
            endDate,
            executionDateTime,
            sale,
            targetQuantity
        }

        await AutoSchedule.create(executionRecord);
        job.attrs.data.randomPrice = randomPrice;
        await job.save();
    });
 
    console.log(`Job '${jobName}' has been defined.`);
    return jobName;
}


const AutoPricingJob = async (sku, maxPrice, minPrice,percentage,amount,category, interval,sale=false,targetQuantity) => {
    const startDate = moment().subtract(1, 'days').toDate(); 
    const endDate = moment().add(6, 'months').toDate(); 
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm');
    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`;

    console.log(percentage,category);
    await defineAutopriceJob(sku, maxPrice, minPrice, startDate, endDate,percentage,amount,category,sale,targetQuantity);

   
    await autoJobsAgenda.start();
    await autoJobsAgenda.every(interval, jobName, { sku, maxPrice, minPrice, startDate, endDate,percentage,amount,category,sale,targetQuantity });

    console.log(`Scheduled auto-pricing job '${jobName}' to run every ${interval}.`);
};


module.exports = AutoPricingJob;