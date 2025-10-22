const axios = require('axios');
const Product = require('../model/Product');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};

// Function to fetch the access token
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
// Function to fetch image by SKU from Amazon API
const getListingOffers = async (sellerSKU, marketplaceId, itemCondition = 'New') => {
  try {
    const accessToken = await fetchAccessToken();
    const url = `https://sellingpartnerapi-na.amazon.com/products/pricing/v0/listings/${encodeURIComponent(sellerSKU)}/offers?MarketplaceId=${marketplaceId}&ItemCondition=${itemCondition}`;
    
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': accessToken,
        'x-amz-date': new Date().toISOString(),
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching listing offers:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to merge listing data with image URLs and save to new schema
const mergeBuyBoxToProduct = async (listings) => {
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(i);
    if (!listing.sellerSku) {
      console.warn(`Skipping listing with SKU ${listing.sellerSku} due to missing listingId.`);
      continue;
    }

    // if(listing.imageUrl){
    //   continue;
    // }

    await delay(1000); 

    try {
       const offers = await getListingOffers(listing.sellerSku, credentials.marketplace_id, 'New');
      const buybox =offers?.payload?.Offers[0]?.IsBuyBoxWinner;
      const offerPrice = offers?.payload?.Summary?.LowestPrices[0]?.LandedPrice?.Amount;

      if (offers) {
        await Product.findOneAndUpdate(
          { sellerSku: listing.sellerSku},
          { offerPrice: offerPrice, buybox:buybox},
          { new: true, upsert: true } 
        );

        console.log(`Merged and saved data for SKU: ${listing.sellerSku}`);
      } else {
        console.warn(`Skipping saving data for SKU ${listing.sellerSku} as image fetch failed.`);
      }
    } catch (error) {
      console.error(`Error fetching image for SKU ${listing.sellerSku}:`, error.message);
    }
  }

  return 'All listings processed';
};

module.exports = {
    mergeBuyBoxToProduct,
};
