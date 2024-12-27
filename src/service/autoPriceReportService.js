const axios = require("axios");
const moment = require("moment-timezone");
const { fetchAccessToken } = require("../middleware/accessToken");
const { marketplace_id } = require("../middleware/credentialMiddleware");
const AutoPriceReport = require("../model/AutoPriceReport");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/*
const fetchSalesMetrics = async (sku, startDateTime, endDateTime) => {
  try {
    const accessToken = await fetchAccessToken();
    const url = "https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics";

    const interval = `${startDateTime}--${endDateTime}`;
    const params = {
      marketplaceIds: marketplace_id,
      interval: interval,
      granularity: "Hour", // Hour granularity
      granularityTimeZone: "America/Los_Angeles", // Use Los Angeles timezone
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

    if (response.data && response.data.payload) {
      // Aggregate the unit counts into a single value
      const totalUnitCount = response.data.payload.reduce(
        (acc, metric) => acc + (metric.unitCount || 0),
        0
      );
      return totalUnitCount; // Return the aggregated unit count
    } else {
      console.error("Unexpected API response:", response.data);
      throw new Error("Unexpected API response format");
    }
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.errors &&
      error.response.data.errors[0].code === "QuotaExceeded"
    ) {
      console.warn("Quota exceeded. Retrying after delay...");
      await delay(6000); // Delay for 5 seconds before retrying
      return fetchSalesMetrics(sku, startDateTime, endDateTime);
    }
    if (error.response) {
      console.error("API Error:", error.response.data);
    } else {
      console.error("Error fetching sales metrics:", error.message);
    }
    throw error;
  }
};

const processAndStoreData = async (autoScheduleResponse) => {
  console.log("called");
  try {
    const autoSchedules = autoScheduleResponse.data.result;

    if (!Array.isArray(autoSchedules) || autoSchedules.length === 0) {
      console.log("No auto-schedule data available.");
      return { message: "No data to process." };
    }

    const storedResults = []; // To store all successful reports

    for (let i = 0; i < autoSchedules.length - 1; i++) {
      const current = autoSchedules[i];
      const next = autoSchedules[i + 1];

      const startDateTime = moment
        .tz(current.executionDateTime, "America/Los_Angeles")
        .toISOString();
      const endDateTime = moment
        .tz(next.executionDateTime, "America/Los_Angeles")
        .toISOString();

      console.log(
        `Processing interval: ${startDateTime} to ${endDateTime} for SKU: ${current.sku}`
      );

      try {
        const unitCount = await fetchSalesMetrics(
          current.sku,
          startDateTime,
          endDateTime
        );
      console.log(unitCount);

        const reportData = {
          sku: current.sku,
          randomPrice: current.randomPrice,
          unitCount: unitCount,
          executionDateTime: current.executionDateTime,
        };
       
        // const result = await AutoPriceReport.create(reportData);
        const filter = {
          sku: reportData.sku,
          randomPrice:reportData.randomPrice,
          executionDateTime: reportData.executionDateTime,
        };
        const result = await AutoPriceReport.updateOne(
          filter,
          {$set:reportData},
          {upsert:true}
        );
     
        storedResults.push(result); // Push to storedResults array
      } catch (error) {
        console.error(
          `Failed to fetch and store data for SKU: ${current.sku}`,
          error.message
        );
      }
    }

    console.log("Processing completed.");
    return { message: "Processing completed", storedResults };
  } catch (error) {
    console.error("Error processing and storing data:", error.message);
    throw new Error("Processing failed.");
  }
};
*/





module.exports = processAndStoreData;
