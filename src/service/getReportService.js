const credentials = require('../middleware/credentialMiddleware');
const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone');

const fetchAccessToken = async (req) => {
    const { lwa_app_id, lwa_client_secret, refresh_token } = credentials;
  
    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: lwa_app_id,
        client_secret: lwa_client_secret,
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error.response ? error.response.data : error.message);
      throw error;
    }
  };
  
  // Function to fetch sales metrics for the last 30 days by SKU
const fetchSalesMetricsByDay = async (sku) => {
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;
  
      // Calculate the interval for the last 30 days
      const endDate = moment().utc().format('YYYY-MM-DD');
      const startDate = moment().utc().subtract(30, 'days').format('YYYY-MM-DD');
      const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;
  
      const params = {
        marketplaceIds:'A2EUQ1WTGCTBG2',
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
        }));
      } else {
        console.error('Unexpected API response:', response.data);
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Error fetching sales metrics:', error.response ? error.response.data : error.message);
      throw error;
    }
  };
  
  module.exports = fetchSalesMetricsByDay;
  