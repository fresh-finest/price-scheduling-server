const axios = require('axios');
const moment = require('moment');

const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};

// Function to fetch the access token from Amazon API
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

// Function to fetch sales metrics using SKU and date range
const fetchSalesMetricsBySKU = async (sku, startDate, endDate) => {
  const maxTries = 7; 
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve,ms));
  
  for(let attempt = 1; attempt <= maxTries;attempt){
  try {
    const accessToken = await fetchAccessToken();
    const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

    const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;

    const params = {
      marketplaceIds: credentials.marketplace_id,
      interval: interval,
      granularity: 'Day',
      granularityTimeZone: 'America/Los_Angeles',
      sku: sku, // Filter by SKU instead of ASIN
    };

    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': accessToken,
        'x-amz-date': new Date().toISOString(),
        'Content-Type': 'application/json',
      },
      params: params,
    });

    if (response.data && response.data.payload) {
      const metrics = response.data.payload;
      let totalUnits = 0;
      let totalSalesAmount = 0;

      metrics.forEach(metric => {
        totalUnits += metric.unitCount;
        if (metric.totalSales) {
          totalSalesAmount += parseFloat(metric.totalSales.amount);
        }
      });

      return {
        totalUnits,
        totalSalesAmount: totalSalesAmount.toFixed(2),
      };
    } else {
      console.error('Unexpected API response:', response.data);
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.errors &&
      error.response.data.errors[0].code === 'QuotaExceeded'
    ) {
      console.warn(`Quota exceeded. Attempt ${attempt} of ${maxRetries}. Retrying in 2 seconds...`);
      await delay(3000); // Wait for 2 seconds before retrying
      continue;
    }

    console.error('Error fetching sales metrics:', error.response ? error.response.data : error.message);
    throw error;
  }
  
}
throw new Error(`Failed to fetch sales metrics after ${maxRetries} attempts due to quota limits.`);
};

// Function to get sales metrics for different time ranges using SKU
const getMetricsForTimeRanges = async (sku) => {
  // const endDate = moment().subtract(1, 'days').utc().format('YYYY-MM-DD');
  const endDate = moment().format('YYYY-MM-DD');


  const timeRanges = [
    { label: '1 D', days: 1 },
    { label: '7 D', days: 7 },
    { label: '15 D', days: 15 },
    { label: '30 D', days: 30 },
    { label: '60 D', days: 60 },
    { label: '90 D', days: 90 },
    { label: '6 M', days: 180 }, // Approximate 6 months
    { label: '1 Y', days: 365 },
  ];

  const results = [];

  for (const range of timeRanges) {
    const startDate = moment().subtract(range.days, 'days').format('YYYY-MM-DD');
    const metrics = await fetchSalesMetricsBySKU(sku, startDate, endDate);
    results.push({
      time: range.label,
      totalUnits: metrics.totalUnits,
      totalSalesAmount: metrics.totalSalesAmount,
    });
  }

  return results;
};

// Exporting the functions to be used in other files
module.exports = {
  getMetricsForTimeRanges
};
