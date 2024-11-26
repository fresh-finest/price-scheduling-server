const moment = require('moment'); // Use moment.js for date manipulation
const { autoJobsAgenda } = require('../Agenda'); // Ensure this exports an initialized Agenda instance
const updateProductSalePrice = require('../UpdatePrice/UpdateSalePrice');


let randomPrice =  0.0;
async function defineAutopriceJob(sku,randomPrice,startDate,endDate,currentDateTime) {

    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`
    autoJobsAgenda.define(jobName, async (job) => {
        // const { sku, maxPrice, minPrice } = job.attrs.data;
         
        console.log("Max Price",);
        console.log(`Updating price for SKU: ${sku} to ${randomPrice}, Start Date: ${startDate}, End Date: ${endDate}`);

        // Call the function to update the product sale price
        await updateProductSalePrice(sku, parseFloat(randomPrice), startDate, endDate);
    });

    console.log(`Job '${jobName}' has been defined.`);
}

const AutoPricingJob = async (sku, maxPrice, minPrice) => {
  
     
    // Generate dynamic job name using SKU and current date and time
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm');
    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`;
  // Generate random price
   randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);

  // Generate date ranges
  const startDate = moment().subtract(1, 'days').toDate();
  const endDate = moment().add(6, 'months').toDate();
    // Define the job dynamically
    await defineAutopriceJob(sku,randomPrice,startDate,endDate,currentDateTime);

    // Schedule the job to run every hour
    await autoJobsAgenda.start();
    await autoJobsAgenda.every('5 minute', jobName, { sku, maxPrice, minPrice,randomPrice,startDate,endDate });

    console.log(`Scheduled auto-pricing job '${jobName}' to run every hour.`);
};

/*
const AutoPricingJob = async (sku, maxPrice, minPrice) => {
    if (!sku || typeof maxPrice !== 'number' || typeof minPrice !== 'number') {
        throw new Error('Invalid input. Ensure SKU, maxPrice, and minPrice are provided.');
    }

    // Generate dynamic job name using SKU and current date and time
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm');
    const jobName = `UpdateAutoPriceChange ${sku} ${currentDateTime}`;

    // Define and schedule the job
    const startDate = moment().subtract(1, 'days').toDate();
    const endDate = moment().add(6, 'months').toDate();
    let randomPrice = 0.0;
    autoJobsAgenda.define(jobName, async (job) => {
        const { sku, maxPrice, minPrice } = job.attrs.data;
        randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);

        

        console.log(`Updating price for SKU: ${sku} to ${randomPrice}, Start Date: ${startDate}, End Date: ${endDate}`);

        
        await updateProductSalePrice(sku, parseFloat(randomPrice), startDate, endDate);
    });

    console.log(`Job '${jobName}' has been defined.`);

    // Start Agenda and schedule the job
    console.log(randomPrice)
    await autoJobsAgenda.start();
    await autoJobsAgenda.every('5 minutes', jobName, { sku, maxPrice, minPrice,randomPrice,startDate,endDate });

    console.log(`Scheduled auto-pricing job '${jobName}' to run every 5 minutes.`);
};
*/
module.exports = AutoPricingJob;
