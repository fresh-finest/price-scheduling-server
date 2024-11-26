

const axios = require('axios');

const { fetchAccessToken } = require("../../middleware/accessToken");
const { marketplace_id,seller_id} = require("../../middleware/credentialMiddleware");

  

  
// Function to get listings item (only return offers amount)
const getSalePrice = async (sku) => {
    const endpoint = `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${seller_id}/${encodeURIComponent(sku)}`;
    const accessToken = await fetchAccessToken();
  
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-amz-access-token': accessToken,
        },
       params: {
        marketplaceIds: marketplace_id,
        issueLocale: 'en_US',
        includedData: 'summaries,attributes,issues,offers,fulfillmentAvailability',
      },
      });
      const discountedPriceSchedule = response.data?.attributes?.purchasable_offer;
      return discountedPriceSchedule;
    } catch (error) {
      console.error('Error fetching listing item:', error.response ? error.response.data : error.message);
      throw error;
    }
  };

  module.exports = getSalePrice;

