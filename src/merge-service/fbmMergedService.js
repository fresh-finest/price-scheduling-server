const axios = require('axios');
const Product = require('../model/Product');



const credentials = {
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

  // Function to fetch inventory summaries from the Amazon API
const fetchInventorySummaries = async () => {
    const endpoint = 'https://sellingpartnerapi-na.amazon.com';
    const path = '/fba/inventory/v1/summaries';
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
        details: true,
        granularityType: 'Marketplace',
        granularityId: credentials.marketplace_id,
        startDateTime: '2023-05-01T00:00:00Z',
      },
    };
  
    console.log('Fetching inventory summaries...');
    try {
      const response = await axios(request);
      console.log('Raw inventory summaries response:', JSON.stringify(response.data, null, 2));
  
      if (response.data?.payload?.inventorySummaries) {
        return response.data.payload.inventorySummaries;
      } else {
        console.warn('No inventory summaries found in response.');
        return [];
      }
    } catch (error) {
      console.error('Error fetching inventory summaries:', error.response ? error.response.data : error.message);
      throw error;
    }
  };
  
  // Function to merge listing data with inventory summaries and store in Product collection
  const mergeAndSaveFbmData = async (listings, inventorySummaries) => {
    return Promise.all(
      listings.map(async (listing) => {
        const inventory = inventorySummaries.find(summary => summary.asin === listing.asin1);
  
        const mergedData = {
          ...listing._doc,
          fulfillableQuantity: inventory?.inventoryDetails?.fulfillableQuantity || 0,
          pendingTransshipmentQuantity: inventory?.inventoryDetails?.reservedQuantity?.pendingTransshipmentQuantity || 0,
        };
  
        const { _id, __v, ...updateData } = mergedData; // Exclude _id and __v from the update
  
        try {
          // Check if a product with this asin1 already exists
          const existingProduct = await Product.findOne({ asin1: listing.asin1 });
  
          // If product exists, check if there are changes
          if (existingProduct) {
            const isSame = Object.keys(updateData).every(
              key => String(existingProduct[key]) === String(updateData[key])
            );
  
            // If data is the same, skip the update
            if (isSame) {
              console.log(`No changes for ASIN: ${listing.asin1}, skipping update.`);
              return existingProduct; // Return existing data as no changes were made
            }
          }
  
          // Only update if there's a difference, or if no existing product is found
          const updatedProduct = await Product.findOneAndUpdate(
            { asin1: listing.asin1 }, // Find by asin1 to prevent duplicates
            updateData,  // Only update fields other than _id and __v
            { new: true, upsert: true } // Create a new document if none exists
          );
          console.log(`Merged and saved data for ASIN: ${listing.asin1}`);
  
          return updatedProduct;
        } catch (error) {
          console.error(`Error saving data for ASIN: ${listing.asin1}`, error.message);
        }
  
        return mergedData; // Return the merged data for further processing or logging if necessary
      })
    );
  };
  
  module.exports = {
    fetchInventorySummaries,
    mergeAndSaveFbmData,
  };