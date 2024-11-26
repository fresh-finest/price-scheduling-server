const axios = require('axios');
const { schedule } = require("node-cron");
const { fetchAccessToken } = require("../../middleware/accessToken");
const { marketplace_id,seller_id } = require("../../middleware/credentialMiddleware");
const { start } = require("agenda/dist/agenda/start");



const updateProductSalePrice = async (sku, value, startDate, endDate) => {
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
      params: { marketplaceIds:marketplace_id },
      data: {
        productType: 'PACIFIER', // The product type from your listing
        patches: [
          {
            op: 'replace',
            path: '/attributes/purchasable_offer',
            value:[
              {
                marketplace_id,
                currency:'USD',
                discounted_price:[
                  {
                    schedule:[
                      {
                        start_at: new Date(startDate).toISOString(),
                        end_at: new Date(endDate).toISOString(),
                        value_with_tax: `${value.toFixed(2)}`
                      }
                    ]
                  }
                ]
              }
            ]
          },
        ],
      },
    };
  
    try {
      const response = await axios(request);
      console.log('Product sale price updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating product sale price:', error.response ? error.response.data : error.message);
      throw error;
    }
  };
  

module.exports = updateProductSalePrice;