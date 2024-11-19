const axios = require('axios');

const { fetchAccessToken } = require("../../middleware/accessToken");
const { marketplace_id, seller_id} = require("../../middleware/credentialMiddleware");

// Function to update product price
const updateProductPrice = async (sku, value) => {
    const endpoint = 'https://sellingpartnerapi-na.amazon.com';
    const path = `/listings/2021-08-01/items/${seller_id}/${encodeURIComponent(sku)}`;
    const accessToken = await fetchAccessToken();
  
    const request = {
      method: 'PATCH',
      url: `${endpoint}${path}`,
      headers: {
        'x-amz-access-token': accessToken,
        'content-type': 'application/json',
      },
      params: { marketplaceIds: marketplace_id },
      data: {
        productType: 'PRODUCT',
        patches: [
          {
            op: 'replace',
            path: '/attributes/purchasable_offer',
            value: [
              {
                marketplace_id: marketplace_id,
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

module.exports = updateProductPrice;