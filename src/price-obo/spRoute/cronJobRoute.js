const cron = require('node-cron');
const moment = require('moment-timezone');
const axios = require('axios');
const { mergeAndSaveImageData } = require('../../merge-service/imageMergedService');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { fetchAndDownloadDataOnce } = require('../../service/inventoryService');
const { loadInventoryToProduct } = require('../../controller/productController');
const Product = require('../../model/Product');
const { fetchFbaInventorySummaries, mergeAndSaveFbaData } = require('../../merge-service/stockMergingToProduct');
const { mergeImageToProduct } = require('../../merge-service/imageMergingToProduct');
const { mergeSaleUnitoProduct } = require('../../merge-service/saleUnitMergetoProduct');

const scheduleCronJobs=()=>{



  cron.schedule('0 8 * * *', async () => {
    const bangladeshTime = moment.tz("Asia/Dhaka").format();
    console.log(`Cron job started at Bangladesh Time: ${bangladeshTime}`);
    await fetchAndDownloadDataOnce();
    
    await loadInventoryToProduct();
    const listings = await Product.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    const inventorySummaries = await fetchFbaInventorySummaries();
    console.log(`Fetched ${inventorySummaries.length} inventory summaries.`);
     await mergeAndSaveFbaData(listings, inventorySummaries);
     await mergeImageToProduct(listings);
     await mergeSaleUnitoProduct(listings);
  }, {
    timezone: "Asia/Dhaka"
  });

  cron.schedule('0 6 * * *', async () => {
    console.log('Running scheduled task to fetch and merge sales data.');
    try {
      const response = await axios.get('http://localhost:3000/update-sale-metrics');
      console.log('Scheduled task completed:', response.data);
    } catch (error) { 

      console.error('Error in scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Dhaka'  
  });

  cron.schedule('0 3 * * *', async () => {
    console.log('Running scheduled task to fetch and merge sales data.');
    try {
      const response = await axios.get('http://localhost:3000/api/sales-report');
      console.log('Scheduled task completed:', response.data);
    } catch (error) { 

      console.error('Error in scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Dhaka'  
  });

  cron.schedule('0 14 * * *', async () => {

    console.log('Running scheduled task to fetch and merge sales data.');
    // Get today's date in Bangladesh time
   const today = dayjs.utc().add(1, 'day');
  
    const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const prevEndDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const prevStartDate = dayjs().subtract(60, 'day').format('YYYY-MM-DD');
  
    const url1 = `http://localhost:3000/api/favourite/report/load-asin?startDate=${startDate}&endDate=${today}&prevStartDate=${prevStartDate}&prevEndDate=${prevEndDate}`;
    const url2 = `http://localhost:3000/api/favourite/report/load-sku?startDate=${startDate}&endDate=${today}&prevStartDate=${prevStartDate}&prevEndDate=${prevEndDate}`;
    
    try {
      await axios.get(url1);
      await axios.get(url2);
      console.log('Cron job executed successfully for sales report.');

    } catch (error) {
      console.error('Error executing cron job:', error.message);
    }
  }, {
    timezone: 'Asia/Dhaka'  
  });



  //'0 */12 * * *'
  // '*/5 * * * *'
  cron.schedule('0 */12 * * *', async () => {
    console.log('Running auto-pricing-report job...');

    try {
        const response = await axios.get('http://localhost:3000/auto-pricing-report');
        
    } catch (error) {
        console.error('Error fetching auto-pricing-report:', error.message);
    }
});
  /*
     // Schedule the task to run every day at 8:00 am Bangladesh time
  cron.schedule('0 8 * * *', async () => {
    const bangladeshTime = moment.tz("Asia/Dhaka").format();
    console.log(`Cron job started at Bangladesh Time: ${bangladeshTime}`);
    await fetchAndDownloadDataOnce();
  }, {
    timezone: "Asia/Dhaka"
  });


  // Adjusted to run at 8:30 AM Bangladesh time
  //30 8
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
  // 0 11
  cron.schedule('0 11 * * *', async () => {
    console.log('Scheduled task started (11:00 AM Bangladesh time)...');
    try {
      // const response = await axios.get('https://api.priceobo.com/fetch-and-merge');
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
      
      console.log('Scheduled task completed:', response.data);
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Dhaka'
  });



  cron.schedule('0 7 * * *', async () => {
    try {
      await loadInventoryToProduct();
      success('Inventory data loaded to Product collection.');
    } catch (error) {
      console.error('Error loading inventory data to Product collection:', error);
    }
  },{timezone:'Asia/Dhaka'});
  */

};


cron.schedule("*/15 * * * *", async () => {
  try {
    console.log("⏳ Running cron job to fetch/store orders...");

    await axios.get("http://localhost:3000/api/orders/store");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
});


cron.schedule("40 16 * * *", async () => {
  try {
    console.log("⏳ Running cron job to fetch/store orders...");

    await axios.get("http://localhost:3000/api/orders/store/each-day");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
 }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

cron.schedule("*/15 * * * *", async () => {
  try {
    console.log("⏳ Running cron tiktok store orders...");

    await axios.post("http://localhost:3000/api/orders");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
});

cron.schedule("*/40 * * * *", async () => {
  try {
    console.log("⏳ Running cron job for merging...");

    await axios.get("http://localhost:3000/api/merge/order");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
});

cron.schedule("50 16 * * *", async () => {
  try {
    console.log("⏳ Running cron job for merging...");

    await axios.get("http://localhost:3000/api/merge/order");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

cron.schedule("30 22 * * *", async () => {
  try {
    console.log("⏳ Running cron job for merging...");

    await axios.get("http://localhost:3000/api/merge/order");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
   }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

cron.schedule("0 22 * * *", async () => {
  try {
    console.log("⏳ Running cron job for merging...");

    await axios.get("http://localhost:3000/api/merge/order");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
   }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

cron.schedule("0 18 * * *", async () => {
  try {
    console.log("⏳ Running daily 6:00 PM BST cron job to fetch/store orders...");

     await axios.get("http://localhost:3000/api/update-status");
  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

cron.schedule("*/20 * * * *", async () => {
  try {
    console.log("⏳ Running daily 6:00 PM BST cron job to fetch/store orders...");

     await axios.get("http://localhost:3000/api/tiktokorder/status");
  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

cron.schedule("30 18 * * *", async () => {
  try {
    console.log("⏳ Running daily 6:00 PM BST cron job to fetch/store orders...");

     await axios.get("http://localhost:3000/api/tiktokorder/update-status");
  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
}, {
  timezone: "Asia/Dhaka" // Set to Bangladesh time
});

// Export the function

// 6 hours update for carrier

cron.schedule("0 */6 * * *", async () => {
  try {
    console.log("⏳ Running cron job for carrier status...");

    await axios.get("http://localhost:3000/api/tiktokorder/update-status");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
});

cron.schedule("0 */6 * * *", async () => {
  try {
    console.log("⏳ Running cron for carrier status...");

    await axios.get("http://localhost:3000/api/update-status");

  } catch (error) {
    console.error("Cron job failed:", error.response?.data || error.message);
  }
});

module.exports = { scheduleCronJobs };