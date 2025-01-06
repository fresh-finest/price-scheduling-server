const axios = require('axios');
const Product = require('../model/Product');
const Stock = require('../model/Stock');
const { fetchAccessToken } = require('../middleware/accessToken');
const { marketplace_id } = require('../middleware/credentialMiddleware');



  const fetchFbaInventorySummaries = async (nextToken = null, allSummaries = []) => {
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
        marketplaceIds: marketplace_id,
        details: true,
        granularityType: 'Marketplace',
        granularityId: marketplace_id,
        startDateTime: '2024-05-01T00:00:00Z',
        ...(nextToken && { nextToken }),  // Include nextToken in the request if available
      },
    };
  
    try {
      const response = await axios(request);
  
      // Log full response in case of debugging needs
      console.log('API Response:', response.data);

      const inventorySummaries = response.data.payload?.inventorySummaries || [];
      const newNextToken = response.data.pagination?.nextToken;
  
      if (Array.isArray(inventorySummaries)) {
        allSummaries = [...allSummaries, ...inventorySummaries];
      } else {
        console.warn('inventorySummaries is not an array:', inventorySummaries);
      }
  
      // If there's a nextToken, fetch the next page
      if (newNextToken) {
        return fetchFbaInventorySummaries(newNextToken, allSummaries);
      }
  
      // Return all accumulated summaries once there is no nextToken
      return allSummaries;
  
    } catch (error) {
      console.error('Error fetching inventory summaries:', error);
      throw error;
    }
  }
  
  // Function to merge listing data with inventory summaries and store in Product collection
  const mergeAndSaveFbaData = async (listings, inventorySummaries) => {
    let i=0;
    return Promise.all(
      listings.map(async (listing) => {
        const inventory = inventorySummaries.find(summary => summary.sellerSku === listing.sellerSku);
  
        const mergedData = {
          ...listing._doc,
          fulfillableQuantity: inventory?.inventoryDetails?.fulfillableQuantity || 0,
          pendingTransshipmentQuantity: inventory?.inventoryDetails?.reservedQuantity?.pendingTransshipmentQuantity || 0,
        };
  
        const { _id, __v, ...updateData } = mergedData; // Exclude _id and __v from the update
  
        try {
          // Check if a product with this asin1 already exists
          const existingProduct = await Product.findOne({ sellerSku: listing.sellerSku });
  
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
            { asin1: listing.asin1, sellerSku: listing.sellerSku }, // Find by asin1 to prevent duplicates
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
    fetchFbaInventorySummaries,
    mergeAndSaveFbaData,
  };