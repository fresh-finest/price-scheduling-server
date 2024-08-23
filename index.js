const express = require('express');
const axios = require('axios');
const cors = require('cors');
const colors = require("colors");

const mongoose = require('mongoose');
const Agenda = require('agenda');
require('dotenv').config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
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
app.post('/api/schedule/change', async (req, res) => {
  const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate } = req.body;

  try {
    // Schedule the price update job
    await agenda.schedule(new Date(startDate), 'schedule price update', {
      sku,
      newPrice: price,
    });

    // Schedule the price revert job, if endDate is provided
    if (endDate) {
      await agenda.schedule(new Date(endDate), 'revert price update', {
        sku,
        originalPrice: currentPrice,
      });
    }

    // Save the schedule details to MongoDB (you can extend this part as per your schema)
    const schedule = new PriceSchedule({ userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate });
    await schedule.save();

    res.json({ success: true, message: 'Schedule saved and jobs queued successfully.' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

// API to update a schedule
app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice } = req.body;

  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Update the schedule with the new details
    schedule.startDate = startDate;
    schedule.endDate = endDate;
    schedule.price = price;
    schedule.currentPrice = currentPrice;

    await schedule.save();

    // Reschedule jobs
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

// API to delete a schedule
app.delete('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await PriceSchedule.findByIdAndDelete(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Cancel any related jobs
    await agenda.cancel({ 'data.sku': schedule.sku });

    res.json({ success: true, message: 'Schedule and associated jobs deleted successfully.' });
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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const scheduleRoute = require("./src/route/Schedule");
const authRoute = require("./src/route/auth");
const userRoute = require("./src/route/user");
const PriceSchedule = require('./src/model/PriceSchedule');

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
