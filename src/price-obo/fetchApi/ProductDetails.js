const { fetchAccessToken } = require("../../middleware/accessToken");
const axios = require('axios');
const { marketplace_id } = require("../../middleware/credentialMiddleware");

const fetchProductDetails = async (asin) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/catalog/2022-04-01/items/${asin}`;
  const accessToken = await fetchAccessToken();

  try {
    const response = await axios({
      method: 'GET',
      url: `${endpoint}${path}`,
      headers: {
        'x-amz-access-token': accessToken,
        'content-type': 'application/json',
      },
      params: {
        marketplaceIds: marketplace_id,  // Corrected param name
        includedData: 'summaries,images,attributes,salesRanks', // Optional: get more details
      },
      timeout: 10000,
    });

   
    return response.data;
  } catch (error) {
    console.error('Error fetching product details:', error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = fetchProductDetails;


/*
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
    console.log("Product details response:", response.data);
    return response.data;
  };

module.exports = fetchProductDetails;

*/