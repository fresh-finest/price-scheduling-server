require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const moment = require("moment");
const { fetchAccessToken } = require("../middleware/accessToken");
const { marketplace_id } = require("../middleware/credentialMiddleware");
const credentials = require("../middleware/credentialMiddleware");
/*
const fetchMontlySalesMetrics = async (sku) => {
  const { marketplace_id } = credentials;
  try {
    const accessToken = await fetchAccessToken();
    const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

    const endDate = moment().utc().format('YYYY-MM-DD');
    const startDate = moment().utc().subtract(365, 'days').format('YYYY-MM-DD');
    const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;
    
    const params = {
      marketplaceIds: credentials.marketplace_id,
      interval: interval,
      granularity: "Day",
      granularityTimeZone: "UTC",
      sku: sku,
    };

    const response = await axios.get(url, {
      headers: {
        "x-amz-access-token": accessToken,
        "x-amz-date": new Date().toISOString(),
        "Content-Type": "application/json",
      },
      params: params,
    });

    // Prepare an array to store data for each of the last 6 months
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthStart = moment().subtract(i, "months").startOf("month");
      const monthEnd =
        i === 0 ? moment().endOf("day") : monthStart.clone().endOf("month"); // Current month up to today, others full month
      return {
        month: monthStart.format("MMMM"), // Name of the month
        startDate: monthStart,
        endDate: monthEnd,
        unitCount: 0,
        totalAmount: 0,
        daysWithSales: 0,
      };
    }); // Reverse to display from oldest to newest

    // Process each day's metric and assign it to the correct month based on the date range
    if (response.data && response.data.payload) {
      response.data.payload.forEach((metric) => {
        const metricDate = moment(metric.interval.split("T")[0]);
        monthlyData.forEach((month) => {
          if (
            metricDate.isBetween(month.startDate, month.endDate, "day", "[]")
          ) {
            month.unitCount += metric.unitCount;
            if (
              metric.averageUnitPrice &&
              parseFloat(metric.averageUnitPrice.amount) > 0
            ) {
              month.totalAmount += parseFloat(metric.averageUnitPrice.amount);
              month.daysWithSales += 1;
            }
          }
        });
      });
    }

    // Finalize the monthly data with average calculations
    const result = monthlyData.map((month) => ({
      //   month: month.month.format('MMMM , YYYY'),
      month: month.startDate.format("MMMM, YYYY"), // Use startDate to get the month and year format
      unitCount: month.unitCount,
      averageAmount:
        month.daysWithSales > 0
          ? (month.totalAmount / month.daysWithSales).toFixed(2)
          : 0,
    }));

    return result;
  } catch (error) {
    console.error(
      "Error fetching sales metrics:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};
*/
/*
const fetchMontlySalesMetrics = async (sku) => {
  const { marketplace_id } = credentials;
  const maxRetries = 7; // Maximum retries for quota errors
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

      const endDate = moment().utc().format('YYYY-MM-DD');
      const startDate = moment().utc().subtract(365, 'days').format('YYYY-MM-DD');
      const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;

      const params = {
        marketplaceIds: marketplace_id,
        interval: interval,
        granularity: "Day",
        granularityTimeZone: "UTC",
        sku: sku,
      };

      const response = await axios.get(url, {
        headers: {
          "x-amz-access-token": accessToken,
          "x-amz-date": new Date().toISOString(),
          "Content-Type": "application/json",
        },
        params: params,
      });

      // Prepare an array to store data for each of the last 12 months
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthStart = moment().utc().subtract(i, "months").startOf("month");
        const monthEnd =
          i === 0 ? moment().utc().endOf("day") : monthStart.clone().endOf("month"); // Current month up to today, others full month
        return {
          month: monthStart.format("MMMM, YYYY"), // Name of the month with year
          startDate: monthStart,
          endDate: monthEnd,
          unitCount: 0,
          totalAmount: 0,
          daysWithSales: 0,
        };
      });

      // Process each day's metric and assign it to the correct month based on the date range
      if (response.data && response.data.payload) {
        response.data.payload.forEach((metric) => {
          const metricDate = moment.utc(metric.interval.split("T")[0]); // Parse metric date in UTC
          monthlyData.forEach((month) => {
            if (
              metricDate.isBetween(month.startDate, month.endDate, "day", "[]")
            ) {
              month.unitCount += metric.unitCount;
              if (
                metric.averageUnitPrice &&
                parseFloat(metric.averageUnitPrice.amount) > 0
              ) {
                month.totalAmount += parseFloat(metric.averageUnitPrice.amount);
                month.daysWithSales += 1;
              }
            }
          });
        });
      }

      // Finalize the monthly data with average calculations
      const result = monthlyData.reverse().map((month) => ({
        month: month.month, // Month with year (e.g., "November, 2024")
        unitCount: month.unitCount,
        averageAmount:
          month.daysWithSales > 0
            ? (month.totalAmount / month.daysWithSales).toFixed(2)
            : 0,
      }));

      return result;
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.errors &&
        error.response.data.errors[0].code === "QuotaExceeded"
      ) {
        console.warn(`Quota exceeded. Attempt ${attempt} of ${maxRetries}. Retrying in 2 seconds...`);
        await delay(3000); // Wait for 2 seconds before retrying
        continue;
      }

      console.error("Error fetching sales metrics:", error.response ? error.response.data : error.message);
      throw error;
    }
  }

  throw new Error(`Failed to fetch monthly sales metrics after ${maxRetries} attempts due to quota limits.`);
};*/
const fetchMontlySalesMetrics = async (identifier, type = "sku") => {
  const { marketplace_id } = credentials;
  const maxRetries = 7; // Maximum retries for quota errors
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

      const endDate = moment().utc().format("YYYY-MM-DD");
      const startDate = moment().utc().subtract(365, "days").format("YYYY-MM-DD");
      const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;

      const params = {
        marketplaceIds: marketplace_id,
        interval: interval,
        granularity: "Day",
        granularityTimeZone: "UTC",
      };

      // Set SKU or ASIN based on the type
      params[type === "sku" ? "sku" : "asin"] = identifier;

      const response = await axios.get(url, {
        headers: {
          "x-amz-access-token": accessToken,
          "x-amz-date": new Date().toISOString(),
          "Content-Type": "application/json",
        },
        params: params,
      });

      // Prepare an array to store data for each of the last 12 months
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthStart = moment().utc().subtract(i, "months").startOf("month");
        const monthEnd =
          i === 0 ? moment().utc().endOf("day") : monthStart.clone().endOf("month"); // Current month up to today, others full month
        return {
          month: monthStart.format("MMMM, YYYY"), // Name of the month with year
          startDate: monthStart,
          endDate: monthEnd,
          unitCount: 0,
          totalAmount: 0,
          daysWithSales: 0,
        };
      });

      // Process each day's metric and assign it to the correct month based on the date range
      if (response.data && response.data.payload) {
        response.data.payload.forEach((metric) => {
          const metricDate = moment.utc(metric.interval.split("T")[0]); // Parse metric date in UTC
          monthlyData.forEach((month) => {
            if (
              metricDate.isBetween(month.startDate, month.endDate, "day", "[]")
            ) {
              month.unitCount += metric.unitCount;
              if (
                metric.averageUnitPrice &&
                parseFloat(metric.averageUnitPrice.amount) > 0
              ) {
                month.totalAmount += parseFloat(metric.averageUnitPrice.amount);
                month.daysWithSales += 1;
              }
            }
          });
        });
      }

      // Finalize the monthly data with average calculations
      const result = monthlyData.reverse().map((month) => ({
        month: month.month, // Month with year (e.g., "November, 2024")
        unitCount: month.unitCount,
        averageAmount:
          month.daysWithSales > 0
            ? (month.totalAmount / month.daysWithSales).toFixed(2)
            : 0,
      }));

      return result;
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.errors &&
        error.response.data.errors[0].code === "QuotaExceeded"
      ) {
        console.warn(`Quota exceeded. Attempt ${attempt} of ${maxRetries}. Retrying in 3 seconds...`);
        await delay(3000); // Wait for 3 seconds before retrying
        continue;
      }

      console.error("Error fetching sales metrics:", error.response ? error.response.data : error.message);
      throw error;
    }
  }

  throw new Error(`Failed to fetch monthly sales metrics after ${maxRetries} attempts due to quota limits.`);
};

module.exports = fetchMontlySalesMetrics;
