const axios = require('axios');
const MergedImage = require('../model/MergedImage'); // Schema for merged data

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch image by SKU from Amazon API
const fetchImageBySKU = async (sku) => {
    const encodedSku = encodeURIComponent(sku);
  try {
    const response = await axios.get(`https://api.priceobo.com/image/${encodedSku}`);
    const summary = response.data?.summaries[0];
    const mainImageUrl = summary?.mainImage?.link || null;
    const fnSku = summary.fnSku || null;
    return {mainImageUrl,fnSku}; // Return the image URL if found
  } catch (error) {
    console.error(`Error fetching image for SKU ${sku}:`, error.message);
    return null; // Return null if fetching fails
  }
};

// Function to merge listing data with image URLs and save to new schema
const mergeAndSaveImageData = async (listings) => {
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(i);
    if (!listing.listingId) {
      console.warn(`Skipping listing with SKU ${listing.sellerSku} due to missing listingId.`);
      continue;
    }

    await delay(1000); // Wait for 1 second between each request

    try {
      const {mainImageUrl,fnSku} = await fetchImageBySKU(listing.sellerSku); // Fetch image by SKU

      if (mainImageUrl) {
        const mergedData = {
          asin1: listing.asin1,
          itemName: listing.itemName,
          itemDescription: listing.itemDescription,
          fulfillmentChannel: listing.fulfillmentChannel,
          price: listing.price,
          sellerSku: listing.sellerSku,
          fnSku:fnSku,
          imageUrl: mainImageUrl, 
          listingId: listing.listingId, 
          quantity: listing.quantity,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          status: listing.status,
        };

        // Upsert the data (insert if doesn't exist, update if it does)
        await MergedImage.findOneAndUpdate(
          { asin1: listing.asin1, sellerSku: listing.sellerSku},
          mergedData,
          { new: true, upsert: true } // Create a new document if none exists
        );

        console.log(`Merged and saved data for SKU: ${listing.sellerSku}`);
      } else {
        console.warn(`Skipping saving data for SKU ${listing.sellerSku} as image fetch failed.`);
      }
    } catch (error) {
      console.error(`Error fetching image for ASIN ${listing.sellerSku}:`, error.message);
    }
  }

  return 'All listings processed';
};

module.exports = {
    mergeAndSaveImageData,
};
