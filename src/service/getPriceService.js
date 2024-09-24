require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};

// Function to fetch the access token
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

// Function to get listings item (only return offers amount)
const getListingsItemBySku = async (sku) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const encodedSku = encodeURIComponent(sku); // Encode SKU to handle special characters
  const path = `/listings/2021-08-01/items/${encodeURIComponent(credentials.seller_id)}/${encodedSku}`;
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
      issueLocale: 'en_US',
      includedData: 'summaries,attributes,issues,offers,fulfillmentAvailability',
    },
  };

  console.log(`Fetching listing item for SKU: ${sku}`);

  try {
    const response = await axios(request);
    const itemData = response.data;

    // Extract the offers amount
    let offerAmount = 'Offer price not available';
    if (itemData.offers && itemData.offers.length > 0) {
      const offer = itemData.offers.find((o) => o.price && o.price.currencyCode === 'USD');
      if (offer && offer.price) {
        offerAmount = offer.price.amount || 'Offer price not specified';
      }
    }

    return { sku, offerAmount }; // Return only the SKU and offer amount
  } catch (error) {
    console.error('Error fetching listing item:', error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = {
  getListingsItemBySku,
};
