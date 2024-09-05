const axios = require('axios');
require('dotenv').config();

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

exports.updateProductPrice = async (sku, value) => {
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
  
  // get /product/:asin
  exports.getProductByAsin = async(req,res,next)=>{
    const { asin } = req.params;
    try {
      const productPricing = await fetchProductPricing(asin);
      res.json(productPricing);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch product pricing' });
    }
  }

  //get /details/:asin 

exports.getDetailsByAsin = async(req,res,next)=>{
    const { asin } = req.params;
    try {
      const productDetails = await fetchProductDetails(asin);
      res.json(productDetails);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch product details' });
    }
}
 
  