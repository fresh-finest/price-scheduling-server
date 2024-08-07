require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const colors = require("colors");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
app.use(cors());



const MONGO="mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/price-calendar?retryWrites=true&w=majority&appName=ppc-db"

mongoose
  .connect(MONGO)
  .then(() => {
    console.log(`Connected to MongoDB!`.green.bold);
  })
  .catch((err) => {
    console.log(err);
  });
  
const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};


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


const getListingsItem = async (sku) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/listings/2021-08-01/items/${credentials.seller_id}/${encodeURIComponent(sku)}`;
  const accessToken = await fetchAccessToken();
 
  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: {
      marketplaceIds: credentials.marketplace_id,
    },
  };


  console.log('Fetching listings item with SKU:', sku);


  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('Error fetching listings item:', error.response ? error.response.data : error.message);
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




const patchListingsItem = async (sku, price) => {
  if (!price) {
    throw new Error('Price is undefined');
  }


  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/listings/2021-08-01/items/${credentials.seller_id}/${encodeURIComponent(sku)}`;
  const accessToken = await fetchAccessToken();
  console.log(accessToken);
  const patchData = {
    productType: 'COSMETIC_BRUSH',
    patches: [
      {
        op: 'replace',
        path: '/attributes/purchasable_offer',
        value: [
          {
            marketplace_id: credentials.marketplace_id,
            currency: 'USD',
            our_price: [
              {
                schedule: [
                  {
                    value_with_tax: `${price.toFixed(2)}`,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };


  const request = {
    method: 'PATCH',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: {
      marketplaceIds: credentials.marketplace_id,
    },
    data: patchData,
  };


  console.log('Updating listings item price with SKU:', sku, 'and price:', price);


  try {
    const response = await axios(request);
    console.log("response",response);
    return response.data;
  } catch (error) {
    console.error('Error updating listings item:', error.response ? error.response.data : error.message);
    throw error;
  }
};


// Endpoint to get product price by SKU
app.get('/product/:sku/price', async (req, res) => {
  const { sku } = req.params;


  try {
    const listingData = await getListingsItem(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product price' });
  }
});

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


// Endpoint to update product price by SKU
app.patch('/product/:sku/price', async (req, res) => {
  const { sku } = req.params;
  const { value } = req.body;
  console.log(value);
  try {
    const result = await patchListingsItem(sku, value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product price' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});