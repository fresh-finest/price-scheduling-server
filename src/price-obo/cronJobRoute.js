const cron = require('node-cron');
const moment = require('moment-timezone');
const axios = require('axios');
const { mergeAndSaveImageData } = require('../merge-service/imageMergedService');
const Inventory = require('../model/Inventory');
const { fetchAndDownloadDataOnce } = require('../service/inventoryService');

const scheduleCronJobs=()=>{
     // Schedule the task to run every day at 8:00 am Bangladesh time
  cron.schedule('40 18 * * *', async () => {
    const bangladeshTime = moment.tz("Asia/Dhaka").format();
    console.log(`Cron job started at Bangladesh Time: ${bangladeshTime}`);
    await fetchAndDownloadDataOnce();
  }, {
    timezone: "Asia/Dhaka"
  });

  // Adjusted to run at 8:30 AM Bangladesh time
  cron.schedule('30 8 * * *', async () => {
    try {
      console.log('Scheduled task started at 8:30 am Bangladesh time...');
      const listings = await Inventory.find();
      console.log(`Fetched ${listings.length} listings from MongoDB.`);
      const result = await mergeAndSaveImageData(listings);
      console.log(result);
    } catch (error) {
      console.error('Error during scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Dhaka'
  });

  // Adjusted to run at 11:00 AM Bangladesh time
  // cron.schedule('30 14 * * *', async () => {
  //   console.log('Scheduled task started (11:00 AM Bangladesh time)...');
  //   // http://localhost:3000
  //   // https://api.priceobo.com
  //   try {
  //     const response = await axios.get(' http://localhost:3000/fetch-and-merge');
  

  //     console.log('API response:', response.data);
  //   } catch (error) {
  //     console.error('Error during cron job:', error);
  //   }
  // }, {
  //   timezone: 'Asia/Dhaka'
  // });

  cron.schedule('30 14 * * *', async () => {
    console.log('Scheduled task started (2:30 PM Bangladesh time)...');
    // Replace the URL with your actual endpoint
    // http://localhost:3000
    // https://api.priceobo.com
    try {
      const response = await axios.get('http://localhost:3000/fetch-and-merge');
      console.log('API response:', response.data);
    } catch (error) {
      console.error('Error during cron job:', error);
    }
  }, {
    timezone: 'Asia/Dhaka'
  });
  // Schedule the cron job for 11:30 AM Bangladesh Time (BST)

  // 30 11
  cron.schedule('30 11 * * *', async () => {
    try {
      console.log('Running scheduled task to fetch and merge sales data.');
      const response = await axios.get('https://api.priceobo.com/fetch-and-merge-sales');
    //   const response = await axios.get('http://localhost:3000/fetch-and-merge-sales');
      console.log('Scheduled task completed:', response.data);
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Dhaka'
  });


};


// Export the function
module.exports = { scheduleCronJobs };