const axios = require("axios");
const moment = require("moment");
const { fetchAccessToken } = require("../middleware/accessToken");
const credentials = require("../middleware/credentialMiddleware");
const { mongoose } = require("mongoose");

const StartDateStateSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  startDate: { type: String },
});
const StartDateState = mongoose.model("StartDateState", StartDateStateSchema);

const fetchDynamicQuantity = async (identifier, type = "sku") => {
  const { marketplace_id } = credentials;
  const maxRetries = 7;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // const startDate = "2025-05-30";
  let skuState = await StartDateState.findOne({ sku:identifier });
  if (!skuState) {
    skuState = new StartDateState({
      sku:identifier,
      startDate: moment().format("YYYY-MM-DD"),
    });
    await skuState.save();
  }

  const startDate = skuState.startDate;
  const endDate = moment().format("YYYY-MM-DD");
  console.log(`Fetching dynamic quantity for ${type} ${identifier} from ${startDate} to ${endDate}`);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

      const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;

      const params = {
        marketplaceIds: marketplace_id,
        interval: interval,
        granularity: "Day",
        granularityTimeZone: "America/Los_Angeles",
      };
      params[type === "sku" ? "sku" : "asin"] = identifier;

      const response = await axios.get(url, {
        headers: {
          "x-amz-access-token": accessToken,
          "x-amz-date": new Date().toISOString(),
          "Content-Type": "application/json",
        },
        params: params,
      });

      if (response.data && response.data.payload) {
        const totalUnitCount = response.data.payload.reduce(
          (sum, metric) => sum + (metric.unitCount || 0),
          0
        );

        return totalUnitCount;
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
        console.warn(
          `Quota exceeded. Attempt ${attempt} of ${maxRetries}. Retrying in 3 seconds...`
        );
        await delay(3000);
        continue;
      }

      console.error(
        "Error fetching sales metrics:",
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  }

  throw new Error(
    `Failed to fetch sales metrics after ${maxRetries} attempts due to quota limits.`
  );
};

module.exports = fetchDynamicQuantity;
