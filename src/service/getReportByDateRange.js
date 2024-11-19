

const axios = require("axios");
const moment = require("moment");
const { fetchAccessToken } = require("../middleware/accessToken");
const { marketplace_id } = require("../middleware/credentialMiddleware");
const credentials = require("../middleware/credentialMiddleware");
/*
const fetchSalesMetricsByDateRange = async (sku, startDate, endDate) => {
    const { marketplace_id } = credentials;
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;
  
      // Construct the interval with the provided start and end dates
      const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;
  
      const params = {
        marketplaceIds: marketplace_id,
        interval: interval,
        granularity: 'Day',
        granularityTimeZone: 'UTC',
        sku: sku,
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
        // Format the data as requested
        return response.data.payload.map(metric => ({
          date: moment(metric.interval.split('T')[0]).format('DD/MM/YYYY'), // Format date as DD/MM/YYYY
          amount: metric.averageUnitPrice ? parseFloat(metric.averageUnitPrice.amount) : 0.0,
          unitCount: metric.unitCount,
        })).reverse();
      } else {
        console.error('Unexpected API response:', response.data);
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Error fetching sales metrics:', error.response ? error.response.data : error.message);
      throw error;
    }
  };
  */
  const fetchSalesMetricsByDateRange = async (sku, startDate, endDate) => {
    const { marketplace_id } = credentials;
    const maxRetries = 7; // Maximum number of retries
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const accessToken = await fetchAccessToken();
        const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;
  
        // Construct the interval with the provided start and end dates
        const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;
  
        const params = {
          marketplaceIds: marketplace_id,
          interval: interval,
          granularity: 'Day',
          granularityTimeZone: 'UTC',
          sku: sku,
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
          // Format the data as requested
          return response.data.payload.map((metric) => ({
            date: moment(metric.interval.split('T')[0]).format('DD/MM/YYYY'), // Format date as DD/MM/YYYY
            amount: metric.averageUnitPrice ? parseFloat(metric.averageUnitPrice.amount) : 0.0,
            unitCount: metric.unitCount,
          })).reverse();
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
        throw error; // Throw other errors
      }
    }
  
    throw new Error(`Failed to fetch sales metrics after ${maxRetries} attempts due to quota limits.`);
  };
  

  module.exports = fetchSalesMetricsByDateRange;  