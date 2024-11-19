const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone');
const { fetchAccessToken } = require('../middleware/accessToken');
const credentials = require('../middleware/credentialMiddleware');
/*
const fetchWeeklySalesMetrics = async (sku) => {
    const { marketplace_id } = credentials;
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;
  
      // Calculate the interval for the last 182 days (26 weeks)
    //   const endDate = moment().utc().endOf('isoWeek'); 
    const endDate = moment().subtract(1, 'days').utc().endOf('isoWeek'); 

      const startDate = moment(endDate).subtract(190, 'days'); // Start date 26 weeks back
      const interval = `${startDate.format('YYYY-MM-DD')}T00:00:00Z--${endDate.format('YYYY-MM-DD')}T23:59:59Z`;
  
      const params = {
        marketplaceIds: marketplace_id,
        interval: interval,
        granularity: 'Day',
        granularityTimeZone: 'UTC',
        sku:sku,
      };
  
      const response = await axios.get(url, {
        headers: {
          'x-amz-access-token': accessToken,
          'x-amz-date': new Date().toISOString(),
          'Content-Type': 'application/json',
        },
        params: params,
      });
  
      // Prepare an array to store 26 weeks of data, each with exactly 7 days
      const weeklyData = Array.from({ length: 26 }, (_, i) => ({
        startDate: moment(endDate).subtract(i * 7, 'days').startOf('isoWeek'),
        endDate: moment(endDate).subtract(i * 7, 'days').endOf('isoWeek'),
        unitCount: 0,
        totalAmount: 0,
        daysWithSales: 0,
      })) // Reverse to get ascending order from oldest to most recent
  
      // Process each day's metric and assign it to the correct week
      if (response.data && response.data.payload) {
        response.data.payload.forEach(metric => {
          const metricDate = moment(metric.interval.split('T')[0]);
  
          // Find the week this metric belongs to
          const week = weeklyData.find(week =>
            metricDate.isSameOrAfter(week.startDate) && metricDate.isSameOrBefore(week.endDate)
          );
  
          if (week) {
            week.unitCount += metric.unitCount;
            if (metric.averageUnitPrice && parseFloat(metric.averageUnitPrice.amount) > 0) {
              week.totalAmount += parseFloat(metric.averageUnitPrice.amount);
              week.daysWithSales += 1;
            }
          }
        });
      }
  
      // Finalize the weekly data with formatted dates and average calculations
      const result = weeklyData.map(week => ({
        week: `${week.startDate.format('MMMM D')} - ${week.endDate.format('MMMM D, YYYY')}`, // Format week as "Month Day - Month Day, Year"
        unitCount: week.unitCount,
        averageAmount: week.daysWithSales > 0 ? (week.totalAmount / week.daysWithSales).toFixed(2) : 0,
      }));
  
      return result;
    } catch (error) {
      console.error('Error fetching sales metrics:', error.response ? error.response.data : error.message);
      throw error;
    }
  };
*/
const fetchWeeklySalesMetrics = async (sku) => {
  const { marketplace_id } = credentials;
  const maxRetries = 7; // Maximum retries for quota errors
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

      // Calculate the interval for the past 26 weeks
      const endDate = moment().utc().endOf('isoWeek'); // End at the last day of the current week
      const startDate = moment(endDate).subtract(182, 'days'); // Start date 26 weeks back

      const interval = `${startDate.format('YYYY-MM-DD')}T00:00:00Z--${endDate.format('YYYY-MM-DD')}T23:59:59Z`;

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

      // Prepare an array to store 26 weeks of data, each with exactly 7 days
      const weeklyData = Array.from({ length: 26 }, (_, i) => ({
        startDate: moment(endDate).subtract(i * 7, 'days').startOf('isoWeek'),
        endDate: moment(endDate).subtract(i * 7, 'days').endOf('isoWeek'),
        unitCount: 0,
        totalAmount: 0,
        daysWithSales: 0,
      })).reverse(); // Reverse to get ascending order from oldest to most recent

      // Process each day's metric and assign it to the correct week
      if (response.data && response.data.payload) {
        response.data.payload.forEach((metric) => {
          const metricDate = moment(metric.interval.split('T')[0]);

          // Find the week this metric belongs to
          const week = weeklyData.find(
            (week) =>
              metricDate.isSameOrAfter(week.startDate) &&
              metricDate.isSameOrBefore(week.endDate)
          );

          if (week) {
            week.unitCount += metric.unitCount;
            if (metric.averageUnitPrice && parseFloat(metric.averageUnitPrice.amount) > 0) {
              week.totalAmount += parseFloat(metric.averageUnitPrice.amount);
              week.daysWithSales += 1;
            }
          }
        });
      }

      // Finalize the weekly data with formatted dates and average calculations
      const result = weeklyData.map((week) => ({
        week: `${week.startDate.format('MMMM D')} - ${week.endDate.format('MMMM D, YYYY')}`, // Format week as "Month Day - Month Day, Year"
        unitCount: week.unitCount,
        averageAmount: week.daysWithSales > 0 ? (week.totalAmount / week.daysWithSales).toFixed(2) : 0,
      }));

      return result;
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

  throw new Error(`Failed to fetch weekly sales metrics after ${maxRetries} attempts due to quota limits.`);
};



  module.exports = fetchWeeklySalesMetrics;
  