require('dotenv').config();
const axios = require('axios');


const credentials ={
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
}

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

  module.exports = {
    getListingsItem
  }