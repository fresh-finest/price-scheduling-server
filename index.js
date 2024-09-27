const express = require('express');
const axios = require('axios');
const cors = require('cors');
const colors = require("colors");
const dayjs = require('dayjs'); 
const mongoose = require('mongoose');
const Agenda = require('agenda');
const moment = require('moment-timezone');
const cron = require('node-cron');
require('dotenv').config();
const cookieParser = require('cookie-parser');

// const { authenticateUser } = require('./src/middleware/authMiddleware');



const app = express();
app.use(express.json());
app.use(cookieParser());  // To parse cookies

// app.use(cors());
const allowedOrigins = ['http://localhost:5173', 'https://api.priceobo.com'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies to be sent/received
}));
app.options('*', cors()); // Enable pre-flight for all routes

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB!`.green.bold);
  })
  .catch((err) => {
    console.log(err);
  });


const agenda = new Agenda({ db: { address: MONGO_URI, collection: 'jobs' } });


const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};

// Function to update product price
const updateProductPrice = async (sku, value) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/listings/2021-08-01/items/${credentials.seller_id}/${encodeURIComponent(sku)}`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'PATCH',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: { marketplaceIds: credentials.marketplace_id },
    data: {
      productType: 'PRODUCT',
      patches: [
        {
          op: 'replace',
          path: '/attributes/purchasable_offer',
          value: [
            {
              marketplace_id: credentials.marketplace_id,
              currency: 'USD',
              our_price: [{ schedule: [{ value_with_tax: `${value.toFixed(2)}` }] }],
            },
          ],
        },
      ],
    },
  };

  try {
    const response = await axios(request);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating product price:', error.response ? error.response.data : error.message);
    throw error;
  }
};



async function defineWeeklyJob(sku, day, timeSlot) {
  console.log("timeSlot: "+JSON.stringify(timeSlot.startTime));

  const jobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.startTime}`;
  console.log(jobName);
  const revertJobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.endTime}`; // Ensure unique job name for each time slot
  agenda.define(jobName, async (job) => {
    const { sku, newPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}, day: ${day}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply weekly price update for SKU: ${sku}, day: ${day}, slot: ${timeSlot.startTime}`, error);
    }
  });

  agenda.define(`revert_${revertJobName}`, async (job) => {
    const { sku, revertPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, day: ${day}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, day: ${day}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

const scheduleWeeklyPriceChange = async (sku, weeklyTimeSlots) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {  // Ensure you're passing the correct timeSlot object here
      console.log(day + timeSlot.startTime);
      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');

      const updateCron = `${startMinute} ${startHour} * * ${day}`;
      const revertCron = `${endMinute} ${endHour} * * ${day}`;

      // Ensure unique job names for each time slot
      const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHour}:${endMinute}`;

      // Pass the correct timeSlot object
      await defineWeeklyJob(sku, day, timeSlot);  // Pass timeSlot, not timeSlots

      await agenda.every(updateCron, updateJobName, { sku, newPrice:timeSlot.newPrice, day });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${timeSlot.startTime}`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice:timeSlot.revertPrice, day });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${timeSlot.endTime}`);
    }
  }
};


async function defineMonthlyJob(sku, date, timeSlot) {
  const jobName = `monthly_price_update_${sku}_date_${date}_slot_${timeSlot.startTime}`; // Ensure unique job name for each time slot
  const revertJobName = `monthly_price_update_${sku}_date_${date}_slot_${timeSlot.endTime}`;

  agenda.define(jobName, async (job) => {
    const { sku, newPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Monthly price update applied for SKU: ${sku}, new price: ${newPrice}, date: ${date}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply monthly price update for SKU: ${sku}, date: ${date}, slot: ${timeSlot.startTime}`, error);
    }
  });

  agenda.define(`revert_${revertJobName}`, async (job) => {
    const { sku, revertPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, date: ${date}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, date: ${date}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

const scheduleMonthlyPriceChange = async (sku, monthlySlots) => {
  for (const [date, timeSlots] of Object.entries(monthlySlots)) {
    for (const timeSlot of timeSlots) {  // Pass each specific timeSlot here
      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');

      const updateCron = `${startMinute} ${startHour} ${date} * *`;
      const revertCron = `${endMinute} ${endHour} ${date} * *`;

      // Ensure unique job names for each time slot
      const updateJobName = `monthly_price_update_${sku}_date_${date}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_monthly_price_update_${sku}_date_${date}_slot_${endHour}:${endMinute}`;

      // Define and schedule the update and revert jobs
      await defineMonthlyJob(sku, date, timeSlot);  // Pass timeSlot, not timeSlots

      await agenda.every(updateCron, updateJobName, { sku, newPrice:timeSlot.newPrice, date });
      console.log(`Scheduled monthly price update for SKU: ${sku} on date ${date} at ${timeSlot.startTime}`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice:timeSlot.revertPrice, date });
      console.log(`Scheduled monthly price revert for SKU: ${sku} on date ${date} at ${timeSlot.endTime}`);
    }
  }
};




// Schedule job to update the price at the specified start date
agenda.define('schedule price update', async (job) => {
  const { sku, newPrice } = job.attrs.data;
  await updateProductPrice(sku, newPrice);
  console.log(`Price updated for SKU: ${sku} to ${newPrice}`);
});

// Schedule job to revert the price at the specified end date
agenda.define('revert price update', async (job) => {
  const { sku, originalPrice } = job.attrs.data;
  await updateProductPrice(sku, originalPrice);
  console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
});

(async function () {
  await agenda.start();
})();


app.post('/api/schedule/change', async (req, res) => {
  // const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate } = req.body;
  const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots} = req.body;
  console.log("Request body:", JSON.stringify(req.body, null, 2));

console.log("hit on post:"+weekly+weeklyTimeSlots+userName);

  try {
   
    // Create a new schedule and save it to the database
    // const newSchedule = new PriceSchedule(req.body);
    const newSchedule = new PriceSchedule({
      userName,
      asin,
      sku,
      title,
      price,
      currentPrice,
      imageURL,
      startDate,
      endDate,
      weekly,
      weeklyTimeSlots,
      monthly,
      monthlyTimeSlots
    });
    await newSchedule.save();

   
    // await newSchedule.save();

    // Log the creation of the schedule to history
    const historyLog = new History({
      scheduleId: newSchedule._id,
      action: 'created',
      userName,
      asin,
      sku,
      title,
      price,
      currentPrice,
      imageURL,
      startDate,
      endDate,
      weekly,
      weeklyTimeSlots,
      monthly,
      monthlyTimeSlots,
    
      timestamp: new Date(),
    });
    await historyLog.save();
    // Handle weekly scheduling
    // if (weekly && daysOfWeek && daysOfWeek.length > 0) {

    //   console.log(sku+daysOfWeek+startTime+endTime);
    //   await scheduleWeeklyPriceChange(sku, price, currentPrice, daysOfWeek,startTime,endTime);
    // }
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      console.log("slots: "+JSON.stringify(weeklyTimeSlots));
      await scheduleWeeklyPriceChange(sku, weeklyTimeSlots);
    }

    // if (monthly && datesOfMonth && datesOfMonth.length > 0) {
    //   console.log(sku+datesOfMonth+startTime+endTime);
    //   await scheduleMonthlyPriceChange(sku, price, currentPrice, datesOfMonth,startTime,endTime);
    // }

    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      console.log("Monthly slots:", JSON.stringify(monthlyTimeSlots, null, 2));
      await scheduleMonthlyPriceChange(sku, monthlyTimeSlots);
    }


    // Handle one-time scheduling
    if (!weekly && !monthly) {
      await agenda.schedule(new Date(startDate), 'schedule price update', {asin, sku, newPrice: price });

      if (endDate) {
        await agenda.schedule(new Date(endDate), 'revert price update', {asin, sku, originalPrice: currentPrice });
      }
    }

   

    // Send the response after all operations are completed
    res.json({ success: true, message: 'Schedule saved and jobs queued successfully.', schedule: newSchedule });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL,weekly,weeklyTimeSlots, monthly, monthlyTimeSlots} = req.body;

  
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Log the previous state of the schedule before updating
    const previousState = {
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      price: schedule.price,
      currentPrice: schedule.currentPrice,
      status: schedule.status,
      title: schedule.title,
      asin: schedule.asin,
      sku: schedule.sku,
      imageURL: schedule.imageURL,
      weekly: schedule.weekly,
      weeklyTimeSlots:schedule.weeklyTimeSlots,
      monthly:schedule.monthly,
      monthlyTimeSlots:schedule.monthlyTimeSlots
    };

    // Update the schedule with new details
    schedule.startDate = startDate;
    schedule.endDate = endDate;
    schedule.price = price;
    schedule.currentPrice = currentPrice;
    schedule.status = 'updated';
    schedule.title = title || schedule.title; // Ensure title is preserved if not updated
    schedule.asin = asin || schedule.asin; // Ensure ASIN is preserved if not updated
    schedule.sku = sku || schedule.sku; // Ensure SKU is preserved if not updated
    schedule.imageURL = imageURL || schedule.imageURL; // Ensure imageURL is preserved if not updated
    schedule.weekly = weekly || false;
    schedule.weeklyTimeSlots = weeklyTimeSlots || [];
    schedule.monthly = monthly || false;
    schedule.monthlySlots = monthlyTimeSlots || [];
    
    await schedule.save();

    // Log the update in history with previous and updated states
    const historyLog = new History({
      scheduleId: schedule._id,
      action: 'updated',
      previousState,
      updatedState: {
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        price: schedule.price,
        currentPrice: schedule.currentPrice,
        status: schedule.status,
        title: schedule.title,
        asin: schedule.asin,
        sku: schedule.sku,
        imageURL: schedule.imageURL,
        imageURL: schedule.imageURL,
        weekly: schedule.weekly,
        weeklyTimeSlots: schedule.weeklyTimeSlots,
        monthly: schedule.monthly,
        monthlyTimeSlots: schedule.monthlyTimeSlots,
      
      },
      userName, // Track the user who made the update
      timestamp: new Date(),
    });
    await historyLog.save();
    
    // Cancel existing jobs
    await agenda.cancel({ 'data.sku': schedule.sku });

    // Re schedule
    
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      await scheduleWeeklyPriceChange(sku,currentPrice, weeklyTimeSlots);
    }
    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      await scheduleMonthlyPriceChange(sku,currentPrice, monthlyTimeSlots);
    }

    if(!weekly && !monthly){
      console.log(schedule.price);
      await agenda.schedule(new Date(startDate), 'schedule price update', {
        sku: schedule.sku,
        newPrice: schedule.price,
      });

      if (endDate) {
        console.log(schedule.currentPrice);
        await agenda.schedule(new Date(endDate), 'revert price update', {
          sku: schedule.sku,
          originalPrice: schedule.currentPrice,
        });
    }
  }

    
    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});



app.delete('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the schedule by ID
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Log the deletion action and previous state in history
    const historyLog = new History({
      scheduleId: schedule._id,
      action: 'deleted',
      userName: schedule.userName,
      asin: schedule.asin,
      sku: schedule.sku,
      title: schedule.title,
      price: schedule.price,
      currentPrice: schedule.currentPrice,
      imageURL: schedule.imageURL,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      weekly: schedule.weekly,
      weeklyTimeSlots: schedule.weeklyTimeSlots,
      monthly: schedule.monthly,
      monthlyTimeSlots: schedule.monthlyTimeSlots,
     
      previousState: { ...schedule.toObject() },
      timestamp: new Date(),
    });
    await historyLog.save();

    // Mark the schedule as deleted (soft delete)
    schedule.status = 'deleted';
    await schedule.save();

    // Cancel any associated jobs
    await agenda.cancel({ 'data.sku': schedule.sku });

    res.json({ success: true, message: 'Schedule marked as deleted and associated jobs canceled.' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Fetch Access Token function
const fetchAccessToken = async () => {
  try {
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: credentials.lwa_app_id,
      client_secret: credentials.lwa_client_secret,
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const fetchProductPricing = async (asin) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/products/pricing/v0/price`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: {
      MarketplaceId: 'ATVPDKIKX0DER',
      Asins: asin,
      ItemType: 'Asin',
    },
  };

  console.log('Fetching product pricing with ASIN:', asin);

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('Error fetching product pricing:', error.response ? error.response.data : error.message);
    throw error;
  }
};



// Function to fetch product details from Amazon SP-API
const fetchProductDetails = async (asin) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/catalog/v0/items/${asin}`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: {
      MarketplaceId: credentials.marketplace_id,
    },
    timeout: 10000,
  };

  const response = await axios(request);
  return response.data;
};


// Schedule the task to run every day at 12:00 PM Bangladesh time
cron.schedule('0 12 * * *', async () => {
  const bangladeshTime = moment.tz("Asia/Dhaka").format();
  console.log(`Cron job started at Bangladesh Time: ${bangladeshTime}`);
  await fetchAndDownloadDataOnce();
}, {
  timezone: "Asia/Dhaka"
});

// Schedule the task to run at 1:00 PM Bangladesh time every day
cron.schedule('0 13 * * *', async () => {
  try {
    console.log('Scheduled task started at 1:00 PM Bangladesh time...');

    // Step 1: Fetch all listings from MongoDB
    const listings = await Inventory.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    // Step 2: Merge listings with image URLs and save to the MergedImage collection
    const result = await mergeAndSaveImageData(listings);
    console.log(result);
  } catch (error) {
    console.error('Error during scheduled task:', error);
  }
}, {
  timezone: 'Asia/Dhaka', // Set the timezone to Bangladesh time
});

/*
// Schedule a cron job to run the fetch and merge task every day at 3:00 PM Bangladesh time
cron.schedule('0 16 * * *', async () => {
  console.log('Scheduled task started at 3:00 PM Bangladesh time...');
  
  try {
    const listings = await MergedProduct.find();
    const inventorySummaries = await fetchInventorySummaries();
    await mergeAndSaveFbmData(listings, inventorySummaries);
    console.log('Data fetching, merging, and saving completed.');
  } catch (error) {
    console.error('Error during scheduled task:', error);
  }
}, {
  timezone: 'Asia/Dhaka', // Set the timezone to Bangladesh (UTC+6)
});*/

// cron.schedule('0 * * * *', async () => {
//   console.log('Scheduled task started...');

//   try {
//     const listings = await MergedProduct.find();
//     const inventorySummaries = await fetchInventorySummaries();
//     await mergeAndSaveFbmData(listings, inventorySummaries);
//     console.log('Data fetching, merging, and saving completed.');
//   } catch (error) {
//     console.error('Error during scheduled task:', error);
//   }
// });

cron.schedule('30 */1 * * *', async () => {
  console.log('Scheduled task started (every two hours)...');
  
  try {
    // Call your API endpoint
    const response = await axios.get('https://api.priceobo.com/fetch-and-merge'); 
    
  } catch (error) {
    console.error('Error during cron job:', error);
  }
}, {
  timezone: 'Asia/Dhaka', // Set the timezone to Bangladesh (UTC+6)
});

// const axios = require('axios');

// (async () => {
//   try {
//     const response = await axios.get('http://localhost:3000/fetch-and-merge');
//     console.log('Manual API call completed:', response.data);
//   } catch (error) {
//     console.error('Manual API call error:', error.message);
//     if (error.response) {
//       console.error('Response status:', error.response.status);
//       console.error('Response data:', error.response.data);
//     }
//   }
// })();


app.get('/fetch-and-merge', async (req, res) => {
  try {
    // Step 1: Fetch all listings from MongoDB
    const listings = await MergedProduct.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    // Step 2: Fetch inventory summaries from the Amazon API
    const inventorySummaries = await fetchInventorySummaries();
    console.log(`Fetched ${inventorySummaries.length} inventory summaries.`);

    // Step 3: Merge listings with inventory summaries based on asin1 and save to the Product collection
    const mergedData = await mergeAndSaveFbmData(listings, inventorySummaries);

    // Step 4: Return the merged data as a response
    res.json(mergedData);
  } catch (error) {
    console.error('Error during data processing:', error);
    res.status(500).json({ error: 'Failed to fetch, merge, and store data' });
  }
});

app.get('/fetch-and-merge-images', async (req, res) => {
  try {
    const listings = await Inventory.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeAndSaveImageData(listings);
    res.json({ message: 'Data merged and saved successfully.', result: mergedData });
  } catch (error) {
    console.error('Error during manual data processing:', error);
    res.status(500).json({ error: 'Failed to fetch, merge, and save data' });
  }
});
// fetch image
app.get('/image/:sku', async (req, res) => {
  // const { sku } = req.params;
  const sku = decodeURIComponent(req.params.sku);
  console.log("sku:"+sku);
  try {
    const listingData = await getListingsItem(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product price' });
  }
});

app.get('/list/:sku',async(req,res)=>{
  const { sku } = req.params;

  try {
    const listingData = await getListingsItemBySku(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing item' });
  }
})


// fetch product using asin
app.get('/product/:asin', async (req, res) => {
  const { asin } = req.params;
  try {
    const productPricing = await fetchProductPricing(asin);
    res.json(productPricing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product pricing' });
  }
});


// Express.js route to fetch product details
app.get('/details/:asin', async (req, res) => {
  const { asin } = req.params;
  try {
    const productDetails = await fetchProductDetails(asin);
    res.json(productDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});


app.get('/api/history/sku/:sku', async(req,res)=>{
  const {sku} = req.params;
  console.log(sku)

  try {
    
    const result = await History.find({sku:sku});
    res.json(result);
  }  catch (error) {
    res.status(400).json({
      status: "Fail",
      message: "Couldn't fetch data.",
      error: error.message
  });
  }
})
app.get('/api/history/:scheduleId', async (req, res) => {
  const { scheduleId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    return res.status(400).json({ error: 'Invalid scheduleId format' });
  }

  try {
    const history = await History.find({ scheduleId: new mongoose.Types.ObjectId(scheduleId) }).sort({ createdAt: -1 });

    if (!history || history.length === 0) {
      return res.status(404).json({ message: 'No history found for this scheduleId' });
    }

    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
app.get('/api/history/', async (req, res) => {
  
  try {
    
    const result = await History.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      status: "Success",
      message: "Successfully fetch data.",
      result,
    });
  } catch (error) {
    res.status(400).json({
      status: "Fail",
      message: "Couldn't fetch data.",
      error: error.message
  });
  }
});

app.get('/fetch-all-listings', async (req, res) => {
  try {
    // const listings = await Inventory.find(); 
    const listings = await Stock.find();
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all listings' });
  }
});

app.get('/api/jobs/:id',async(req,res)=>{
  const {asin}= req.params;
  try {
    const jobs = await agenda._collection.find({ 'data.asin': asin }).toArray();

    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Error fetching jobs by id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
})


app.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;


  try {
    // Call the sendEmail function
    await sendEmail(to, subject, text, html);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email');
  }
});


app.get('/', (req, res) => {
  res.send('Server is running!');
});

// const PORT = 3000;
app.listen(process.env.PORT,'0.0.0.0', () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

const scheduleRoute = require("./src/route/Schedule");
const authRoute = require("./src/route/auth");
const userRoute = require("./src/route/user");
const PriceSchedule = require('./src/model/PriceSchedule');
const History = require('./src/model/HistorySchedule');
const sendEmail = require('./src/service/EmailService');
// const Listing = require('./src/model/Listing');
const Product = require("./src/model/Product");
const Inventory = require("./src/model/Inventory");
const MergedProduct = require('./src/model/MergedImage');

const { fetchAndDownloadDataOnce } = require('./src/service/inventoryService');
const { getListingsItem } = require('./src/service/ImageService');
const { mergeAndSaveImageData } = require('./src/merge-service/imageMergedService');
const { fetchInventorySummaries, mergeAndSaveFbmData } = require('./src/merge-service/fbmMergedService');
const Stock = require('./src/model/Stock');
const { getListingsItemBySku } = require('./src/service/getPriceService');


app.use("/api/schedule", scheduleRoute);
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});
