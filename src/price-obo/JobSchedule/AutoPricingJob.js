const moment = require('moment'); 
const { autoJobsAgenda } = require('../Agenda'); 

const updateProductSalePrice = require('../UpdatePrice/UpdateSalePrice');
const AutoSchedule = require('../../model/AutoSchedule');



async function defineAutopriceJob(sku, maxPrice, minPrice, startDate, endDate) {
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm');
    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`;

    autoJobsAgenda.define(jobName, async (job) => {
        const { sku, maxPrice, minPrice, startDate, endDate } = job.attrs.data;

        
        const randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
        const executionDateTime = moment().format('YYYY-MM-DD HH:mm');

        console.log(`Updating price for SKU: ${sku} to ${randomPrice}, Start Date: ${startDate}, End Date: ${endDate}`);
        
        
        await updateProductSalePrice(sku, parseFloat(randomPrice), startDate, endDate);
      
        const executionRecord = {
            sku,
            maxPrice,
            minPrice,
            randomPrice,
            startDate,
            endDate,
            executionDateTime
        }

        await AutoSchedule.create(executionRecord);
        job.attrs.data.randomPrice = randomPrice;
        await job.save();
    });

    console.log(`Job '${jobName}' has been defined.`);
    return jobName;
}


const AutoPricingJob = async (sku, maxPrice, minPrice) => {
    const startDate = moment().subtract(1, 'days').toDate(); 
    const endDate = moment().add(6, 'months').toDate(); 
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm');
    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`;

    await defineAutopriceJob(sku, maxPrice, minPrice, startDate, endDate);

   
    await autoJobsAgenda.start();
    await autoJobsAgenda.every('1 hour', jobName, { sku, maxPrice, minPrice, startDate, endDate });

    console.log(`Scheduled auto-pricing job '${jobName}' to run every 5 minutes.`);
};


module.exports = AutoPricingJob;
