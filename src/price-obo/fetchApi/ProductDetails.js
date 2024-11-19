const { fetchAccessToken } = require("../../middleware/accessToken");
const axios = require('axios');
const { marketplace_id } = require("../../middleware/credentialMiddleware");

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
        MarketplaceId: marketplace_id,
      },
      timeout: 10000,
    };
  
    const response = await axios(request);
    return response.data;
  };

module.exports = fetchProductDetails;