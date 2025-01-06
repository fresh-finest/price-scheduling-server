const axios = require('axios');
const MergedImage = require('../model/MergedImage'); // Schema for merged data
const Product = require('../model/Product');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch image by SKU from Amazon API
const fetchImageBySKU = async (sku) => {
    const encodedSku = encodeURIComponent(sku);
  try {
    const response = await axios.get(`https://api.priceobo.com/image/${encodedSku}`);
    // const response = await axios.get(`http://localhost:3000/image/${encodedSku}`);
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
const mergeImageToProduct = async (listings) => {
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(i);
    if (!listing.sellerSku) {
      console.warn(`Skipping listing with SKU ${listing.sellerSku} due to missing listingId.`);
      continue;
    }

    await delay(1000); 

    try {
      const {mainImageUrl,fnSku} = await fetchImageBySKU(listing.sellerSku); 

      if (mainImageUrl) {
        await Product.findOneAndUpdate(
          { asin1: listing.asin1, sellerSku: listing.sellerSku},
          { imageUrl: mainImageUrl, fnSku:fnSku },
          { new: true, upsert: true } 
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
    mergeImageToProduct,
};
