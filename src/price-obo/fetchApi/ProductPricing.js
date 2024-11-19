const { fetchAccessToken } = require("../../middleware/accessToken");
const axios = require('axios');
const { marketplace_id } = require("../../middleware/credentialMiddleware");

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
        MarketplaceId: marketplace_id,
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

  module.exports = fetchProductPricing;