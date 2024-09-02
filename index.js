const express = require('express');
const axios = require('axios');
const cors = require('cors');
const colors = require("colors");
const dayjs = require('dayjs'); 
const mongoose = require('mongoose');
const Agenda = require('agenda');
require('dotenv').config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  'https://main.d3iyq7ecbzumwp.amplifyapp.com',
  'http://localhost:5173',
  'https://changing-price.netlify.app',
  'https://price-changing.netlify.app',
  'https://dps-fresh-finest.netlify.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization',
};

app.use(cors(corsOptions));

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/price-calendar?retryWrites=true&w=majority&appName=ppc-db";
;

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
      productType: 'COSMETIC_BRUSH',
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
    return response.data;
  } catch (error) {
    console.error('Error updating product price:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to calculate the next occurrence of a day
/*
const getNextDayOfWeek = (dayOfWeek, hour = 0, minute = 0) => {
  const now = dayjs();
  let nextDay = now.day(dayOfWeek).hour(hour).minute(minute).second(0);

  if (nextDay.isBefore(now)) {
    nextDay = nextDay.add(1, 'week');
  }

  return nextDay.toDate();
};

agenda.define('weekly price update', async (job) => {
  const { sku, newPrice, daysOfWeek } = job.attrs.data;

  for (const day of daysOfWeek) {
    const startDate = getNextDayOfWeek(day);
    await agenda.schedule(startDate, 'schedule price update', { sku, newPrice });
  }

  console.log(`Weekly price update scheduled for SKU: ${sku} on days: ${daysOfWeek.join(', ')}`);
});

agenda.define('revert weekly price update', async (job) => {
  const { sku, originalPrice, daysOfWeek } = job.attrs.data;

  for (const day of daysOfWeek) {
    const startDate = getNextDayOfWeek(day, 23, 59); // Revert at the end of the day
    await agenda.schedule(startDate, 'revert price update', { sku, originalPrice });
  }

  console.log(`Weekly price revert scheduled for SKU: ${sku} on days: ${daysOfWeek.join(', ')}`);
}); */

// Define a recurring job with cron-like scheduling
agenda.define('weekly price update', async (job) => {
  const { sku, newPrice } = job.attrs.data;

  try {
    await updateProductPrice(sku, newPrice);
    console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}`);
  } catch (error) {
    console.error(`Failed to apply weekly price update for SKU: ${sku}`, error);
  }
});

// Define the revert job
agenda.define('revert weekly price update', async (job) => {
  const { sku, originalPrice } = job.attrs.data;

  try {
    await updateProductPrice(sku, originalPrice);
    console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
  } catch (error) {
    console.error(`Failed to revert price for SKU: ${sku}`, error);
  }
});

// Schedule the recurring jobs for specified days of the week
async function scheduleWeeklyPriceChange(sku, newPrice, originalPrice, daysOfWeek) {
  for (const day of daysOfWeek) {
    const updateCron = `0 0 * * ${day}`; // At midnight on the specified day
    const revertCron = `59 23 * * ${day}`; // At 11:59 PM on the specified day

    // Use a unique job name for each day to avoid overwriting
    const updateJobName = `weekly price update ${sku} day ${day}`;
    const revertJobName = `revert weekly price update ${sku} day ${day}`;

    // Schedule the price update for each day in daysOfWeek
    await agenda.every(updateCron, updateJobName, { sku, newPrice });

    // Schedule the price revert for each day in daysOfWeek
    await agenda.every(revertCron, revertJobName, { sku, originalPrice });
  }
}

// Define a recurring job with cron-like scheduling for monthly updates
agenda.define('monthly price update', async (job) => {
  const { sku, newPrice } = job.attrs.data;

  try {
    await updateProductPrice(sku, newPrice);
    console.log(`Monthly price update applied for SKU: ${sku}, new price: ${newPrice}`);
  } catch (error) {
    console.error(`Failed to apply monthly price update for SKU: ${sku}`, error);
  }
});

// Define the revert job for monthly updates
agenda.define('revert monthly price update', async (job) => {
  const { sku, originalPrice } = job.attrs.data;

  try {
    await updateProductPrice(sku, originalPrice);
    console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
  } catch (error) {
    console.error(`Failed to revert price for SKU: ${sku}`, error);
  }
});

// Schedule the recurring jobs for specified dates of the month
async function scheduleMonthlyPriceChange(sku, newPrice, originalPrice, datesOfMonth) {
  for (const date of datesOfMonth) {
    const updateCron = `0 0 ${date} * *`; // At midnight on the specified date of the month
    const revertCron = `59 23 ${date} * *`; // At 11:59 PM on the specified date of the month

    // Use a unique job name for each date to avoid overwriting
    const updateJobName = `monthly price update ${sku} date ${date}`;
    const revertJobName = `revert monthly price update ${sku} date ${date}`;

    // Schedule the price update for each date in datesOfMonth
    await agenda.every(updateCron, updateJobName, { sku, newPrice });

    // Schedule the price revert for each date in datesOfMonth
    await agenda.every(revertCron, revertJobName, { sku, originalPrice });
  }
}

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

// API to save the schedule and queue the jobs
/*
app.post('/api/schedule/change', async (req, res) => {
  const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate } = req.body;

  try {
    
    await agenda.schedule(new Date(startDate), 'schedule price update', {
      sku,
      newPrice: price,
    });

   
    if (endDate) {
      await agenda.schedule(new Date(endDate), 'revert price update', {
        sku,
        originalPrice: currentPrice,
      });
    }

  
    const schedule = new PriceSchedule({ userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate });
    await schedule.save();

    res.json({ success: true, message: 'Schedule saved and jobs queued successfully.' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});
*/

// API to update a schedule
/*
app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice } = req.body;

  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    
    schedule.startDate = startDate;
    schedule.endDate = endDate;
    schedule.price = price;
    schedule.currentPrice = currentPrice;
    schedule.status='updated'; 
    await schedule.save();

   
    await agenda.cancel({ 'data.sku': schedule.sku });

    await agenda.schedule(new Date(startDate), 'schedule price update', {
      sku: schedule.sku,
      newPrice: price,
    });

    if (endDate) {
      await agenda.schedule(new Date(endDate), 'revert price update', {
        sku: schedule.sku,
        originalPrice: currentPrice,
      });
    }

    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});
*/


// API to delete a schedule
/*
app.delete('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await PriceSchedule.findByIdAndDelete(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    schedule.status ='deleted'
    await schedule.save();

  
    await agenda.cancel({ 'data.sku': schedule.sku });

    res.json({ success: true, message: 'Schedule and associated jobs deleted successfully.' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});
*/
app.post('/api/schedule/change', async (req, res) => {
  // const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate } = req.body;
  const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate, weekly, daysOfWeek, monthly, datesOfMonth  } = req.body;


  try {
    // Create a new schedule and save it to the database
    const newSchedule = new PriceSchedule(req.body);
    await newSchedule.save();

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
      daysOfWeek,
      monthly,
      datesOfMonth,
      timestamp: new Date(),
    });
    await historyLog.save();
    // Handle weekly scheduling
    if (weekly && daysOfWeek && daysOfWeek.length > 0) {

      console.log(daysOfWeek);
      await scheduleWeeklyPriceChange(sku, price, currentPrice, daysOfWeek);
    }

    if (monthly && datesOfMonth && datesOfMonth.length > 0) {
      console.log(datesOfMonth);
      await scheduleMonthlyPriceChange(sku, price, currentPrice, datesOfMonth);
    }


    // Handle one-time scheduling
    if (!weekly && !monthly) {
      await agenda.schedule(new Date(startDate), 'schedule price update', { sku, newPrice: price });

      if (endDate) {
        await agenda.schedule(new Date(endDate), 'revert price update', { sku, originalPrice: currentPrice });
      }
    }

    // if (weekly && daysOfWeek && daysOfWeek.length > 0) {
    //   await agenda.schedule(new Date(), 'weekly price update', {
    //     sku,
    //     newPrice: price,
    //     daysOfWeek,
    //   });

    //   await agenda.schedule(new Date(), 'revert weekly price update', {
    //     sku,
    //     originalPrice: currentPrice,
    //     daysOfWeek,
    //   });
    // } else {
    //   await agenda.schedule(new Date(startDate), 'schedule price update', { sku, newPrice: price });

    //   if (endDate) {
    //     await agenda.schedule(new Date(endDate), 'revert price update', { sku, originalPrice: currentPrice });
    //   }
    // }
    // Schedule the price update job
    // await agenda.schedule(new Date(startDate), 'schedule price update', {
    //   sku,
    //   newPrice: price,
    // });

    // Schedule the price revert job, if endDate is provided
    // if (endDate) {
    //   await agenda.schedule(new Date(endDate), 'revert price update', {
    //     sku,
    //     originalPrice: currentPrice,
    //   });
    // }

    // Send the response after all operations are completed
    res.json({ success: true, message: 'Schedule saved and jobs queued successfully.', schedule: newSchedule });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL } = req.body;

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
      },
      userName, // Track the user who made the update
      timestamp: new Date(),
    });
    await historyLog.save();
    
    // Cancel existing jobs
    await agenda.cancel({ 'data.sku': schedule.sku });

    // Schedule new jobs
    await agenda.schedule(new Date(startDate), 'schedule price update', {
      sku: schedule.sku,
      newPrice: price,
    });

    if (endDate) {
      await agenda.schedule(new Date(endDate), 'revert price update', {
        sku: schedule.sku,
        originalPrice: currentPrice,
      });
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


app.get('/api/history/:schdeuleId', async (req, res) => {
  const { scheduleId } = req.params;

  try {
    
    const history = await History.find({scheduleId}).sort({ createdAt: -1 });

    
    res.json(history);
  } catch (error) {
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
    const listings = await Listing.find(); // Example limit, adjust as needed

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all listings' });
  }
});




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
  res.send('Hello, World!');
});

const PORT = 3000;
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

const scheduleRoute = require("./src/route/Schedule");
const authRoute = require("./src/route/auth");
const userRoute = require("./src/route/user");
const PriceSchedule = require('./src/model/PriceSchedule');
const History = require('./src/model/HistorySchedule');
const sendEmail = require('./src/service/EmailService');
const Listing = require('./src/model/Listing');

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
