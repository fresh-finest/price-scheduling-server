const axios = require('axios');
const SaleStock = require('../model/SaleStock');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch sales metrics by ASIN using the local API, with retry logic for 'QuotaExceeded' errors
const fetchSalesMetricsSKU = async (sku) => {
  const encodedSku = encodeURIComponent(sku);
  console.log(encodedSku)
    try {
      // Fetch sales metrics from the local API
      // const response = await axios.get(`https://api.priceobo.com/sales-metrics-by-asin/${sku}`);

      const response = await axios.get(`https://api.priceobo.com/sales-metrics-by-sku/${encodedSku}`);
      // const response = await axios.get(`http://localhost:3000/sales-metrics-by-sku/${encodedSku}`);


      return response.data; // Return the sales metrics from the response
    } catch (error) {
      console.error(`Error fetching sales metrics for SKU ${sku}:, error.message`);
      return null; // Return null if fetching fails
    }
  };

// Function to merge listing data with sales metrics and save to new schema
const mergeAndSaveSalesData = async (listings) => {
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(i);

    if (!listing.listingId) {
      console.warn(`Skipping listing with SKU ${listing.sellerSku} due to missing listingId.`);
      continue;
    }

    await delay(10000); // Wait for 1 second between each request to avoid hitting the API limit

    try {
      const salesMetrics = await fetchSalesMetricsSKU(listing.sellerSku); // Fetch sales metrics by ASIN

      if (salesMetrics) {
        const mergedData = {
          asin1: listing.asin1,
          itemName: listing.itemName,
          itemDescription: listing.itemDescription,
          quantity:listing.quantity,
          fulfillableQuantity:listing.fulfillableQuantity,
          fulfillmentChannel: listing.fulfillmentChannel,
          pendingQuantity:listing.pendingQuantity,
          pendingTransshipmentQuantity:listing.pendingTransshipmentQuantity,
          price: listing.price,
          imageUrl:listing.imageUrl,
          sellerSku: listing.sellerSku,
          fnSku:listing.fnSku,
          listingId: listing.listingId,
          quantity: listing.quantity,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          status: listing.status,
          salesMetrics: salesMetrics,
         
        };

      
        await SaleStock.findOneAndUpdate(
          { sellerSku:listing.sellerSku },
          mergedData,
          { new: true, upsert: true } // Create a new document if none exists
        );

        console.log(`Merged and saved data for SKU: ${listing.sellerSku}`);
      } else {
        console.warn(`Skipping saving data for SKU ${listing.sellerSku} as sales metrics fetch failed.`);
      }
    } catch (error) {
      console.error(`Error processing ASIN ${listing.sellerSku}:`, error.message);
    }
  }

  return 'All listings processed';
};

module.exports = {
  mergeAndSaveSalesData,
};
