const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const NodeCache = require("node-cache");

const moment = require("moment-timezone");
const {
  fetchInventorySummaries,
  mergeAndSaveFbmData,
} = require("../../merge-service/fbmMergedService");
const {
  mergeAndSaveImageData,
} = require("../../merge-service/imageMergedService");
const sendEmail = require("../../service/EmailService");
const MergedProduct = require("../../model/MergedImage");
const Inventory = require("../../model/Inventory");
const {
  mergeAndSaveSalesData,
} = require("../../merge-service/saleUnitMergedService");
const { getListingsItem } = require("../../service/ImageService");
const { getListingsItemBySku } = require("../../service/getPriceService");
const fetchProductPricing = require("../fetchApi/ProductPricing");
const fetchProductDetails = require("../fetchApi/ProductDetails");
const History = require("../../model/HistorySchedule");
const { getMetricsForTimeRanges } = require("../../service/getSaleService");
const fetchSalesMetricsByDateRange = require("../../service/getReportByDateRange");
const fetchSalesMetricsByDay = require("../../service/getReportService");
const fetchWeeklySalesMetrics = require("../../service/getReportWeeklyService");
const fetchMontlySalesMetrics = require("../../service/getReportMonthlyService");
const SaleStock = require("../../model/SaleStock");
const processReport = require("../../service/reportService");
const Report = require("../../model/Report");
const Stock = require("../../model/Stock");
const { agenda } = require("../Agenda");
const updateProductSalePrice = require("../UpdatePrice/UpdateSalePrice");
const getSalePrice = require("../fetchApi/SalePrice");
const {
  mergeJobsAndSchedules,
} = require("../../merge-service/jobScheduleMergeService");
const { createClient } = require("redis");
const CachedJob = require("../../model/CachedJob");
const TimeZone = require("../../model/TimeZone");

const app = express();


router.get("/fetch-and-merge", async (req, res) => {
  try {
    // Step 1: Fetch all listings from MongoDB
    const listings = await MergedProduct.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    // Step 2: Fetch inventory summaries from the Amazon API
    const inventorySummaries = await fetchInventorySummaries();
    console.log(`Fetched ${inventorySummaries.length} inventory summaries.`);

    // Step 3: Merge listings with inventory summaries based on asin1 and save to the Product collection
    const mergedData = await mergeAndSaveFbmData(listings, inventorySummaries);

    // Step 4: Return the merged data as a response
    res.json(mergedData);
  } catch (error) {
    console.error("Error during data processing:", error);
    res.status(500).json({ error: "Failed to fetch, merge, and store data" });
  }
});

router.get("/fetch-and-merge-images", async (req, res) => {
  try {
    const listings = await Inventory.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeAndSaveImageData(listings);
    res.json({
      message: "Data merged and saved successfully.",
      result: mergedData,
    });
  } catch (error) {
    console.error("Error during manual data processing:", error);
    res.status(500).json({ error: "Failed to fetch, merge, and save data" });
  }
});
router.get("/fetch-and-merge-sales", async (req, res) => {
  try {
    const listings = await Stock.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeAndSaveSalesData(listings);
    res.json({
      message: "Data merged and saved successfully.",
      result: mergedData,
    });
  } catch (error) {
    console.error("Error during manual data processing:", error);
    res.status(500).json({ error: "Failed to fetch, merge, and save data" });
  }
});
// fetch image
router.get("/image/:sku", async (req, res) => {
  // const { sku } = req.params;
  const sku = decodeURIComponent(req.params.sku);
  console.log("sku:" + sku);
  try {
    const listingData = await getListingsItem(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product price" });
  }
});

router.get("/list/:sku", async (req, res) => {
  const { sku } = req.params;

  try {
    const listingData = await getListingsItemBySku(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch listing item" });
  }
});

// fetch product using asin
router.get("/product/:asin", async (req, res) => {
  const { asin } = req.params;
  try {
    const productPricing = await fetchProductPricing(asin);
    res.json(productPricing);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product pricing" });
  }
});

// Express.js route to fetch product details
router.get("/details/:asin", async (req, res) => {
  const { asin } = req.params;
  try {
    const productDetails = await fetchProductDetails(asin);
    res.json(productDetails);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product details" });
  }
});

router.get("/api/history/sku/:sku", async (req, res) => {
  const { sku } = req.params;
  console.log(sku);

  try {
    const result = await History.find({ sku: sku });
    res.json(result);
  } catch (error) {
    res.status(400).json({
      status: "Fail",
      message: "Couldn't fetch data.",
      error: error.message,
    });
  }
});

router.get("/sales-metrics-by-sku/:sku", async (req, res) => {
  // const { sku } = req.params;
  const sku = decodeURIComponent(req.params.sku);
  console.log("sku" + sku);
  try {
    const results = await getMetricsForTimeRanges(sku);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales metrics" });
  }
});
// Route to fetch the last 30 days of sales metrics
/*
  router.get('/sales-metrics/range/:sku', async (req, res) => {
    const { sku } = req.params;
    const { startDate, endDate } = req.query;
  
    // Validate that both startDate and endDate are provided
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required query parameters' });
    }
  
    try {
      const metrics = await fetchSalesMetricsByDateRange(sku, startDate, endDate);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales metrics' });
    }
  });
*/
router.get("/sales-metrics/range/:identifier", async (req, res) => {
  const { identifier } = req.params;
  const { startDate, endDate, type = "sku" } = req.query; // Default type is "sku"

  // Validate that both startDate and endDate are provided
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "startDate and endDate are required query parameters" });
  }

  // Validate that the type is either "sku" or "asin"
  if (!["sku", "asin"].includes(type)) {
    return res
      .status(400)
      .json({ error: 'Invalid type. Allowed values are "sku" or "asin".' });
  }

  try {
    const metrics = await fetchSalesMetricsByDateRange(
      identifier,
      startDate,
      endDate,
      type
    );
    res.json(metrics);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch sales metrics", message: error.message });
  }
});

/*
  router.get('/sales-metrics/day/:sku', async (req, res) => {
    const { sku } = req.params;
  
    try {
      const metrics = await fetchSalesMetricsByDay(sku);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales metrics' });
    }
  });
  */
router.get("/sales-metrics/day/:identifier", async (req, res) => {
  const { identifier } = req.params; // Identifier can be SKU or ASIN

  const { type = "sku" } = req.query; // Default type is "sku"
  if (!["sku", "asin"].includes(type)) {
    return res
      .status(400)
      .json({ error: 'Invalid type. Allowed values are "sku" or "asin".' });
  }

  try {
    const metrics = await fetchSalesMetricsByDay(identifier, type);
    res.json(metrics);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch sales metrics", message: error.message });
  }
});

router.get("/sales-metrics/week/:sku", async (req, res) => {
  const { sku } = req.params;

  try {
    const metrics = await fetchWeeklySalesMetrics(sku);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales metrics" });
  }
});
/*
  router.get('/sales-metrics/month/:sku', async (req, res) => {
    const { sku } = req.params;
  
    try {
      const metrics = await fetchMontlySalesMetrics(sku);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales metrics' });
    }
  });
  */
router.get("/sales-metrics/month/:identifier", async (req, res) => {
  const { identifier } = req.params;
  const { type = "sku" } = req.query;

  if (!["sku", "asin"].includes(type)) {
    return res
      .status(400)
      .json({ error: 'Invalid type. Allowed values are "sku" or "asin".' });
  }

  try {
    const metrics = await fetchMontlySalesMetrics(identifier, type);
    res.json(metrics);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch sales metrics", message: error.message });
  }
});

router.get("/api/history/:scheduleId", async (req, res) => {
  const { scheduleId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    return res.status(400).json({ error: "Invalid scheduleId format" });
  }

  try {
    const history = await History.find({
      scheduleId: new mongoose.Types.ObjectId(scheduleId),
    }).sort({ createdAt: -1 });

    if (!history || history.length === 0) {
      return res
        .status(404)
        .json({ message: "No history found for this scheduleId" });
    }

    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
/*
router.get("/api/history/", async (req, res) => {
  try {
    const result = await History.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: "Success",
      message: "Successfully fetch data.",
      result,
    });
  } catch (error) {
    res.status(400).json({
      status: "Fail",
      message: "Couldn't fetch data.",
      error: error.message,
    });
  }
});
*/
const cache = new NodeCache({ stdTTL: 300 }); // 300 seconds = 5 minutes

router.get("/api/history/", async (req, res) => {
  const cacheKey = "history_data"; // Unique key for this endpoint's data

  try {
    // Check if data is present in the cache
    if (cache.has(cacheKey)) {
      console.log("Cache hit");
      return res.status(200).json({
        status: "Success",
        message: "Successfully fetched data from cache.",
        result: cache.get(cacheKey), // Return cached data
      });
    }

    console.log("Cache miss, fetching data from database...");
    // Fetch data from the database
    const result = await History.find().sort({ createdAt: -1 });

    // Store the result in the cache
    cache.set(cacheKey, result);

    res.status(200).json({
      status: "Success",
      message: "Successfully fetched data.",
      result,
    });
  } catch (error) {
    res.status(400).json({
      status: "Fail",
      message: "Couldn't fetch data.",
      error: error.message,
    });
  }
});
router.get("/fetch-all-listings", async (req, res) => {
  try {
    // const listings = await Inventory.find();
    const listings = await SaleStock.find();
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all listings" });
  }
});
/*
router.get("/api/jobs", async (req, res) => {
  // const { sku } = req.params;
  // console.log('Requested scheduleId:', sku);

  try {
    // Make sure scheduleId is a string
    const jobs = await agenda._collection.find().toArray();

    if (jobs.length === 0) {
      console.log("No jobs found for sku:", sku);
    }

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching jobs by scheduleId:", error);
    res.status(500).json({ success: false, error: "Failed to fetch jobs" });
  }
});

*/
router.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await CachedJob.find(); // Fetch jobs from cached collection

    if (jobs.length === 0) {
      console.log("No cached jobs found.");
    }

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching cached jobs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch cached jobs" });
  }
});



// router.get("/api/jobs", async (req, res) => {
//   try {
//     const cachedJobs = await redisClient.get("jobs");
//     if (cachedJobs) {
//       return res.json({ success: true, jobs: JSON.parse(cachedJobs) });
//     }

//     const jobs = await agenda._collection.find().toArray();
//     await redisClient.set("jobs", JSON.stringify(jobs), "EX", 3600); // Cache for 1 hour

//     res.json({ success: true, jobs });
//   } catch (error) {
//     console.error("Error fetching jobs:", error);
//     res.status(500).json({ success: false, error: "Failed to fetch jobs" });
//   }
// });


router.get("/api/sales-report", async (req, res) => {
  try {
    const scheduleResponse = await axios.get(
      "https://api.priceobo.com/api/schedule"
    );
    // const scheduleResponse = await axios.get('http://localhost:3000/api/schedule');
    const schedules = scheduleResponse.data.result;

    const report = await processReport(schedules);
    res.json(report);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch and mergee sales metrics and schedule",
        message: error.message,
      });
  }
});

router.get("/api/report/:sku", async (req, res) => {
  const { sku } = req.params;

  if (!sku) {
    return res.status(400).json({ error: "SKU parameter is required" });
  }

  try {
    const metrics = await Report.find({ sku: sku });

    if (!metrics || metrics.length === 0) {
      return res
        .status(404)
        .json({ error: "No sales metrics found for this SKU" });
    }

    res.json(metrics);
  } catch (error) {
    console.error("Error fetching sales metrics:", error);
    res.status(500).json({ error: "Failed to fetch sales metrics" });
  }
});

router.get("/api/report", async (req, res) => {
  try {
    const metrics = await Report.find();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales metrics" });
  }
});

router.get("/sale-price/:sku", async (req, res) => {
  //decodeURIComponent(
  const sku = req.params.sku;

  try {
    const salePrice = await getSalePrice(sku);
    res.json(salePrice);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch  sale price" });
  }
});

router.post("/send-email", async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    // Call the sendEmail function
    await sendEmail(to, subject, text, html);
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending email");
  }
});

router.patch("/sale-price", async (req, res) => {
  const { value, startDate, endDate, sku } = req.body;

  if (!sku || !value || !startDate || !endDate) {
    return res.status(400).json({
      error: "sku, salePrice, startDate, and endDate are required.",
    });
  }

  try {
    const response = await updateProductSalePrice(
      sku,
      value,
      startDate,
      endDate
    );
    res.status(200).json({
      message: "Sale price updated successfully",
      data: response,
    });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "Failed to update sale price",
      details: error.response ? error.response.data : error.message,
    });
  }
});


router.put("/api/time-zone", async (req, res) => {
  const { timeZone } = req.body;

  try {
      
      if (!moment.tz.zone(timeZone)) {
          return res.status(400).json({ error: 'Invalid time zone' });
      }

      
      const result = await TimeZone.updateOne(
          {}, 
          { $set: { timeZone } }, 
          { upsert: true, runValidators: true } 
      );

      res.status(200).json({ 
          status: "Success",
          message: "Successfully updated timezone",
          result
      });
  } catch (error) {
      res.status(500).json({
          status: "Failed",
          message: "Failed to update timeZone",
          error: error.message
      });
  }
});

router.get("/api/time-zone",async(req,res)=>{
  try {
    const result = await TimeZone.find({});
    res.status(200).json({
      status:"Success",
      message:"Successfully get timezone",
      result
    })
  } catch (error) {
    res.status(500).json({
      status:"Failed",
      message:"Failed to get timeZone",
      error:error.message
    })
  }
})

router.post("/api/time-zone",async(req,res)=>{
  try {
    const result = await TimeZone.create(req.body);
    res.json({result});
  } catch (error) {
    res.json({error:error.message})
  }
})

module.exports = router;
