const axios = require('axios');
const SaleStock = require('../model/SaleStock');
const Product = require('../model/Product');
const { getMetricsForTimeRanges } = require('../service/getSaleService');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch sales metrics by ASIN using the local API, with retry logic for 'QuotaExceeded' errors
const fetchSalesMetricsSKU = async (sku) => {
  const encodedSku = encodeURIComponent(sku);
  console.log(encodedSku)
    try {
      // Fetch sales metrics from the local API
      // const response = await axios.get(`https://api.priceobo.com/sales-metrics-by-asin/${sku}`);

      // const response = await axios.get(`https://api.priceobo.com/sales-metrics-by-sku/${encodedSku}`);
      // const response = await axios.get(`http://localhost:3000/sales-metrics-by-sku/${encodedSku}`);

      const response = await getMetricsForTimeRanges(sku);
     
     

      return response; // Return the sales metrics from the response
    } catch (error) {
      console.error(`Error fetching sales metrics for SKU ${sku}:, ${error.message}`);
      return null; // Return null if fetching fails
    }
  };

// Function to merge listing data with sales metrics and save to new schema
const mergeSaleUnitoProduct = async (listings) => {
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(i);

    if (!listing.sellerSku) {
      console.warn(`Skipping listing with SKU ${listing.sellerSku} due to missing listingId.`);
      continue;
    }

    await delay(10000); // Wait for 1 second between each request to avoid hitting the API limit

    try {
      const salesMetrics = await fetchSalesMetricsSKU(listing.sellerSku); // Fetch sales metrics by ASIN
      
      if (salesMetrics) {    
        await Product.findOneAndUpdate(
          { sellerSku:listing.sellerSku },
          { salesMetrics: salesMetrics},
          { new: true, upsert: true }
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
    mergeSaleUnitoProduct,
};
