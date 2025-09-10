const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const NodeCache = require("node-cache");
const multer = require("multer");
const csv = require("csv-parser");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const storage = multer.memoryStorage();
const { DateTime } = require("luxon");

const moment = require("moment-timezone");
const {
  fetchInventorySummaries,
  mergeAndSaveFbmData,
} = require("../../merge-service/fbmMergedService");
const {
  mergeAndSaveImageData,
} = require("../../merge-service/imageMergedService");
// const sendEmail = require("../../service/EmailService");
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
const {
  mergeImageToProduct,
} = require("../../merge-service/imageMergingToProduct");
const Product = require("../../model/Product");
const {
  fetchFbaInventorySummaries,
  mergeAndSaveFbaData,
} = require("../../merge-service/stockMergingToProduct");
const {
  mergeSaleUnitoProduct,
} = require("../../merge-service/saleUnitMergetoProduct");
const { fetchAndDownloadDataOnce } = require("../../service/inventoryService");
const {
  loadInventoryToProduct,
} = require("../../controller/productController");

const { start } = require("agenda/dist/agenda/start");
const AutoSchedule = require("../../model/AutoSchedule");
const Warehouse = require("../../model/Warehouse");

const {
  fetchSalesMetrics,
  updateSaeReport,
} = require("../../service/saleReportService");
const {
  getDynamicInterval,
  fetchOrderMetrics,
} = require("../../service/totalSaleService");
const fetchDynamicQuantity = require("../../service/getDynamictQuantityService");
const ScanOrder = require("../../model/scanOrder");
const Order = require("../../model/Order");
const FBMUser = require("../../model/fbmUser");
const TrackScan = require("../../model/trackScan");
const TikTokAuth = require("../../model/TikTokAuth");
const TikTokOrder = require("../../model/TikTokOrder");
const VTOrder = require("../../model/VTOrder");
const VTMergeOrder = require("../../model/VTMergeOrder");
const ReserveProduct = require("../../model/ReserveProduct");

const app = express();

router.get("/report-data", async (req, res) => {
  try {
    const reports = await fetchAndDownloadDataOnce();
    res.status(200).json({ reports });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

router.get("/stock-merge-to-product", async (req, res) => {
  try {
    // Step 1: Fetch all listings from MongoDB
    const listings = await Product.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    const inventorySummaries = await fetchFbaInventorySummaries();
    console.log(`Fetched ${inventorySummaries.length} inventory summaries.`);
    const mergedData = await mergeAndSaveFbaData(listings, inventorySummaries);
    res.json(mergedData);
  } catch (error) {
    console.error("Error during data processing:", error);
    res.status(500).json({ error: "Failed to fetch, merge, and store data" });
  }
});
router.get("/api/sync", async (req, res) => {
  try {
    // await fetchAndDownloadDataOnce();
    await loadInventoryToProduct();
    const listings = await Product.find();
    const inventorySummaries = await fetchFbaInventorySummaries();
    await mergeAndSaveFbaData(listings, inventorySummaries);
    res.status(200).json({ success: true, message: "Successfully synced." });
  } catch (error) {
    console.error("Error during data processing:", error);
    res.status(500).json({ error: "Failed to syncing." });
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
router.get("/image-merge-to-porduct", async (req, res) => {
  try {
    const listings = await Product.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeImageToProduct(listings);
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
router.get("/saleunit-merge-to-product", async (req, res) => {
  try {
    const listings = await Product.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeSaleUnitoProduct(listings);
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

router.get("/update-sale-metrics", async (req, res) => {
  try {
    const products = await Product.find();
    const skus = products.map((product) => product.sellerSku);
    // const skus = products.map((product)=> product.sellerSku);

    const endDate = DateTime.now().toISODate();
    const startDate = DateTime.now().minus({ years: 2 }).toISODate();
    for (const sku of skus) {
      const saleMetrics = await fetchSalesMetrics(sku, startDate, endDate);
      await updateSaeReport(sku, saleMetrics);
    }
    res.status(200).json({ message: "Successfully updated sale metrics." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/*
router.get("/update-sale-metrics", async (req, res) => {
  try {
    const products = await Product.find();

    // Group SKUs by ASIN
    const asinToSkus = {};
    products.forEach((product) => {
      const asin = product.asin1;
      const sku = product.sellerSku;
      if (asin) {
        if (!asinToSkus[asin]) asinToSkus[asin] = [];
        asinToSkus[asin].push(sku);
      }
    });

    const endDate = DateTime.now().toISODate();
    const startDate = DateTime.now().minus({ years: 2 }).toISODate();

    for (const [asin, skus] of Object.entries(asinToSkus)) {
      try {
        const saleMetrics = await fetchSalesMetrics(asin, startDate, endDate);
        for (const sku of skus) {
          await updateSaeReport(sku, saleMetrics);
        }
        console.log(`✅ Successfully updated sales for ASIN ${asin}`);
      } catch (error) {
        console.error(`Skipping ASIN ${asin} due to error:`, error.message);
        // Continue with the next ASIN
      }
    }

    res.status(200).json({ message: "Sale metrics update completed with error handling." });
  } catch (error) {
    console.error("Fatal error during update:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});
*/

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
  try {
    const jobs = await agenda._collection
      .find()
      .sort({ lastRunAt: -1 }) // Sort by latest run
      .limit(100)               // Limit to 100
      .toArray();

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching recent jobs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch jobs" });
  }
});*/

router.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await CachedJob.find(); // Fetch jobs from cached collection

    if (jobs.length === 0) {
      console.log("No cached jobs found.");
    }

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching cached jobs:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch cached jobs" });
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

router.delete("/api/auto-schedule/:sku", async (req, res) => {
  const { sku } = req.params;

  try {
    const deleteSchedule = await AutoSchedule.deleteMany({ sku });
    console.log(deleteSchedule);
    if (deleteSchedule.deletedCount > 0) {
      console.log(
        `Successfully deleted ${deleteSchedule.deletedCount} records for SKU: ${sku}`
      );
      return res.json({
        success: true,
        message: `Deleted ${deleteSchedule.deletedCount} records for SKU: ${sku}`,
      });
    } else {
      console.log(`No records found for SKU: ${sku}`);
      return res
        .status(404)
        .json({ success: false, message: `No records found for SKU: ${sku}` });
    }
  } catch (error) {
    console.error(
      `Error deleting AutoSchedule records for SKU: ${sku}:`,
      error.message
    );
    return res.status(500).json({ success: false, error: error.message });
  }
});

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
    res.status(500).json({
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
      return res.status(400).json({ error: "Invalid time zone" });
    }

    const result = await TimeZone.updateOne(
      {},
      { $set: { timeZone } },
      { upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: "Success",
      message: "Successfully updated timezone",
      result,
    });
  } catch (error) {
    res.status(500).json({
      status: "Failed",
      message: "Failed to update timeZone",
      error: error.message,
    });
  }
});

router.get("/api/time-zone", async (req, res) => {
  try {
    const result = await TimeZone.find({});
    res.status(200).json({
      status: "Success",
      message: "Successfully get timezone",
      result,
    });
  } catch (error) {
    res.status(500).json({
      status: "Failed",
      message: "Failed to get timeZone",
      error: error.message,
    });
  }
});

router.post("/api/time-zone", async (req, res) => {
  try {
    const result = await TimeZone.create(req.body);
    res.json({ result });
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/total-sales", async (req, res) => {
  const interval = getDynamicInterval();

  try {
    const orderMetrics = await fetchOrderMetrics(interval);
    res.json(orderMetrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order metrics" });
  }
});

// const upload = multer({ dest: 'uploads/' });

const upload = multer({ storage: multer.memoryStorage() });

router.post("/warehouse/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const bufferStream = Readable.from(req.file.buffer);

    const currentData = [];
    const batchId = new Date().toISOString();

    // Mark old data as not latest
    await Warehouse.updateMany({ isLatest: true }, { isLatest: false });

    bufferStream
      .pipe(csv())
      .on("data", (row) => {
        if (["Brecx FBM", "Brecx-Shelves"].includes(row.WarehouseName)) {
          const itemCount = parseInt(row.ItemCount) || 0;
          const qty = parseInt(row.Qty) || 0;

          currentData.push({
            WarehouseId: parseInt(row.WarehouseId),
            locationId: parseInt(row.locationid),
            WarehouseName: row.WarehouseName,
            LocationCode: row.LocationCode,
            ItemCount: itemCount,
            Qty: qty,
            LastUpdate: row.LastUpdate,
            FBMEnabled: row.FBMEnabled,
            TotalValue: parseFloat(row.TotalValue) || 0,
            WId: row.WId,
            Note: row.Note,
            Items: row.Items,
            isOutOfStock: itemCount === 0 || qty === 0,
            uploadedAt: new Date(),
            batchId,
            isLatest: true,
          });
        }
      })
      .on("end", async () => {
        await Warehouse.insertMany(currentData);
        res.json({ message: "Upload successful", batchId });
      })
      .on("error", (err) => {
        console.error("CSV Parse Error:", err);
        res.status(500).json({ error: "Failed to parse CSV" });
      });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server error during upload" });
  }
});

router.get("/warehouse", async (req, res) => {
  const current = await Warehouse.find({ isLatest: true, isOutOfStock: true });
  const previous = await Warehouse.find({
    isLatest: false,
    isOutOfStock: true,
  });

  const previousBatch = {};

  for (let item of previous) {
    if (!previousBatch[item.batchId]) {
      previousBatch[item.batchId] = [];
    }
    previousBatch[item.batchId].push(item);
  }

  const recentBatch = Object.keys(previousBatch).sort().reverse()[0];
  const previousData = previousBatch[recentBatch] || [];

  res.json({ current, previous: previousData });
});

// shopify admin api sections
router.post("/request-quote", async (req, res) => {
  const { cart, note, email } = req.body;

  const draftOrder = {
    draft_order: {
      line_items: cart.items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price / 100,
      })),
      note,
      email,
      tags: "Quote Request",
    },
  };

  try {
    const result = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/draft_orders.json`,
      draftOrder,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      success: true,
      draftOrder: result.data.draft_order,
    });
  } catch (error) {
    console.error(
      "Error creating draft order:",
      err.response?.data || err.message
    );
    return res.status(500).json({ error: "Failed to create draft order" });
  }
});

router.get("/quantity", async (req, res) => {
  //  const sku=
  try {
    const quantity = await fetchDynamicQuantity("B-BB-2864", "sku");
    res.status(200).json({
      quantity,
    });
  } catch (error) {
    console.log(error);
  }
});

// veeqo
const VEEQO_API_URL = "https://api.veeqo.com/orders";
const SHIPPING_EVENTS_URL = "https://api.veeqo.com/shipping/tracking_events";
const VEEQO_API_KEY = process.env.VEEQO_API_KEY;

router.get("/api/orders", async (req, res) => {
  try {
    const {
      page = 1,
      page_size = 100,
      status = "shipped",
      created_at_min,
      created_at_max,
      updated_at_min,
      tags,
      allocated_at,
      query,
      since_id,
    } = req.query;
    const dynamicCreatedAtMin =
      created_at_min ||
      moment().subtract(30, "days").format("YYYY-MM-DD HH:mm:ss");
    const params = {
      status,
      page,
      page_size,
      created_at_min: dynamicCreatedAtMin,
      updated_at_min,
      tags,
      allocated_at,
      query,
      since_id,
    };

    // Clean empty params
    Object.keys(params).forEach((key) => {
      if (!params[key]) delete params[key];
    });

    // 1. Fetch Veeqo orders
    const response = await axios.get(VEEQO_API_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": VEEQO_API_KEY,
      },
      params,
    });

    let veeqoOrders = response.data.orders || response.data; // depends on API format

    if (created_at_max) {
      const maxDate = new Date(created_at_max);
      veeqoOrders = veeqoOrders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate <= maxDate;
      });
    }

    // 2. Extract order IDs to match
    const veeqoOrderIds = veeqoOrders.map((order) => order.id.toString());

    // 3. Fetch matching ScannerOrders
    const scannerOrders = await ScanOrder.find({
      orderId: { $in: veeqoOrderIds },
    });

    // 4. Create a map for fast lookup
    const scannerMap = {};
    scannerOrders.forEach((scan) => {
      scannerMap[scan.orderId] = scan;
    });

    // 5. Merge Scanner data into Veeqo orders
    const mergedOrders = veeqoOrders.map((order) => {
      const scanData = scannerMap[order.id.toString()];
      return {
        ...order,
        scanStatus: scanData?.scanStatus || null,
        picked: scanData?.picked || false,
        packed: scanData?.packed || false,
        trackingNumber: scanData?.trackingNumber || null,
        scanUpdatedAt: scanData?.updatedAt || null,
      };
    });

    res.status(200).json({ result: mergedOrders });
  } catch (error) {
    console.error(
      "Error fetching or merging orders:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch merged orders" });
  }
});

router.get("/api/orders/scan", async (req, res) => {
  const { query, role, userName } = req.query;

  console.log("Scan request received with query:", query, "and role:", role);

  if (!query || !role) {
    return res.status(400).json({ error: "query and user role are required" });
  }

  let trackingNumber = query.trim();
  if (!trackingNumber.startsWith("1Z") && !trackingNumber.startsWith("TBA")) {
    trackingNumber = trackingNumber.replace(/\D/g, "").slice(-22);
  }

  try {
    const response = await axios.get(VEEQO_API_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": VEEQO_API_KEY,
      },
      params: {
        query: trackingNumber,
      },
    });
    const order1 = await VTOrder.findOne({ trackingNumber });
    console.log(order1);
    const order = response.data[0]; // Assume first match

    if (!order1) {
      return res.status(404).json({ error: "Order not found!" });
    }

    const { OrderId: orderId } = order1;

    let existingScan = await TrackScan.findOne({ orderId });

    if (role === "picker") {
      if (!existingScan) {
        existingScan = await TrackScan.create({
          pickerName: userName,
          pickerRole: role,
          orderId,
          pickedTrackingNumbers: [trackingNumber],
          picked: true,
          packed: false,
          scanStatus: "picked",
          pickedAt: new Date(),
        });
      } else {
        if (existingScan.pickedTrackingNumbers.includes(trackingNumber)) {
          return res.status(400).json({ error: "Already picked" });
        }
        existingScan.pickedTrackingNumbers.push(trackingNumber);
        existingScan.pickedAt = new Date();
        await existingScan.save();
      }
      return res.json({
        message: "Successfully Picked!",
        data: order1,
        scanStatus: existingScan,
      });
    }

    if (role === "packer") {
      // Packer can only scan after picker
      if (!existingScan || !existingScan.picked) {
        return res.status(400).json({ error: "Cannot pack before pick" });
      }
      if (existingScan.packedTrackingNumbers?.includes(trackingNumber)) {
        return res.status(400).json({ error: "Already packed" });
      }
      existingScan.packedTrackingNumbers.push(trackingNumber);
      existingScan.packerName = userName;
      existingScan.packerRole = role;
      existingScan.packed = true;
      existingScan.scanStatus = "packed";
      existingScan.packedAt = new Date();
      await existingScan.save();

      return res.json({
        message: "Successfully Packed!",
        data: order1,
        scanStatus: existingScan,
      });
    }

    return res.status(400).json({ error: "Invalid user Role" });
  } catch (error) {
    console.error("Scan error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to process scan" });
  }
});

router.post("/api/orders/bulk/scan", async (req, res) => {
  try {
    const { email, password, userName, role, trackingNumbers = [] } = req.body;
    console.log("Bulk scan request received with data:", req.body);

    if (
      !email ||
      !password ||
      !role ||
      !userName ||
      !Array.isArray(trackingNumbers)
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Authenticate user
    const user = await FBMUser.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid password" });

    const results = [];

    for (let rawTracking of trackingNumbers) {
      let trackingNumber = rawTracking.trim();

      if (
        !trackingNumber.startsWith("1Z") &&
        !trackingNumber.startsWith("TBA")
      ) {
        trackingNumber = trackingNumber.slice(-22);
      }

      const order = await VTOrder.findOne({
        trackingNumber: { $in: [trackingNumber] },
      });
      if (!order) {
        results.push({
          trackingNumber,
          status: "not_found",
          message: "Order not found",
        });
        continue;
      }

      const { OrderId: orderId } = order;
      let existingScan = await TrackScan.findOne({ orderId });

      if (role === "picker") {
        if (!existingScan) {
          existingScan = await TrackScan.create({
            pickerName: userName,
            pickerRole: role,
            orderId,
            pickedTrackingNumbers: [trackingNumber],
            packedTrackingNumbers: [],
            picked: true,
            packed: false,
            scanStatus: "picked",
            pickedAt: new Date(),
          });
          results.push({
            trackingNumber,
            status: "picked",
            message: "Successfully Picked",
          });
        } else {
          if (existingScan.pickedTrackingNumbers.includes(trackingNumber)) {
            results.push({
              trackingNumber,
              status: "already_picked",
              message: "Already Picked",
            });
          } else {
            existingScan.pickedTrackingNumbers.push(trackingNumber);
            existingScan.pickedAt = new Date();
            await existingScan.save();
            results.push({
              trackingNumber,
              status: "picked",
              message: "Successfully Picked",
            });
          }
        }
      } else if (role === "packer") {
        if (!existingScan || !existingScan.picked) {
          results.push({
            trackingNumber,
            status: "not_ready",
            message: "Cannot pack before pick",
          });
        } else {
          if (!existingScan.pickedTrackingNumbers.includes(trackingNumber)) {
            results.push({
              trackingNumber,
              status: "not_picked",
              message: "This tracking number wasn't picked",
            });
            continue;
          }

          if (!existingScan.packedTrackingNumbers)
            existingScan.packedTrackingNumbers = [];

          if (existingScan.packedTrackingNumbers.includes(trackingNumber)) {
            results.push({
              trackingNumber,
              status: "already_packed",
              message: "Already Packed",
            });
          } else {
            existingScan.packedTrackingNumbers.push(trackingNumber);

            const allPacked = existingScan.trackingNumber.every((t) =>
              existingScan.packedTrackingNumbers.includes(t)
            );

            if (allPacked) {
              existingScan.packed = true;
              existingScan.scanStatus = "packed";
              existingScan.packedAt = new Date();
            }

            existingScan.packerName = userName;
            existingScan.packerRole = role;
            await existingScan.save();

            results.push({
              trackingNumber,
              status: "packed",
              message: "Successfully Packed",
            });
          }
        }
      } else {
        results.push({
          trackingNumber,
          status: "invalid_role",
          message: "Invalid role",
        });
      }
    }

    res.status(200).json({ success: true, summary: results });
  } catch (error) {
    console.error("Bulk Scan Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/orders/store", async (req, res) => {
  try {
    const pageSize = 100;
    const totalOrders = 1500;
    const totalPages = Math.ceil(totalOrders / pageSize);
    const allOrders = [];

    // Retry helper for TikTok API
    // const fetchTikTokSummary = async (orderId, retries = 7) => {
    //   const url = `http://localhost:3000/api/order/${orderId}/summary`;

    //   for (let i = 0; i < retries; i++) {
    //     try {
    //       const res = await axios.get(url);
    //       return res.data;
    //     } catch (err) {
    //       console.warn(`Retry ${i + 1} failed for ${orderId}`);
    //       if (i === retries - 1) throw err;
    //       await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
    //     }
    //   }
    // };

    for (let page = 1; page <= totalPages; page++) {
      const response = await axios.get(VEEQO_API_URL, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": VEEQO_API_KEY,
        },
        params: {
          page,
          page_size: pageSize,
          status: "shipped",
        },
      });

      const rawOrders = response.data;

      for (const order of rawOrders) {
        const allocations = order.allocations || [];

        const trackingNumbers = allocations
          .map((a) => a?.shipment?.tracking_number?.tracking_number)
          .filter(Boolean);

        const tags = (order.tags || []).map((tag) => ({
          name: tag.name || "",
        }));

        const structuredOrder = {
          id: String(order.id),
          OrderId: String(order.number),
          created_at: order.shipped_at || "",
          shipped_at: order.shipped_at || "",
          carrier_name:
            order.allocations?.[0]?.shipment?.service_carrier_name || "",
          customerName: order.customer?.full_name || "",
          address: order.customer?.billing_address?.address1 || "",
          trackingNumber: trackingNumbers,
          shipmentId:
            order.allocations?.[0]?.shipment?.tracking_number?.shipment_id ||
            "",
          trackingUrl: order.allocations?.[0]?.shipment?.tracking_url || "",
          status:
            order.allocations?.[0]?.shipment?.tracking_number?.status || "",
          tags,
          channelCode: order.channel?.type_code || "",
          channelName: order.channel?.name || "",
          items: (order.allocations || [])
            .flatMap((allocation) => allocation.line_items || [])
            .map((item) => {
              const sellable = item.sellable || {};
              return {
                sku: sellable.sku_code || "",
                quantity: item.quantity || 0,
                title: sellable.product_title || sellable.title || "",
                image: sellable.image_url || sellable.main_thumbnail_url || "",
              };
            }),
        };

        // ✅ Enrich TikTok data (if TikTokOrderID tag exists)
        // const tiktokTag = tags.find((t) => t.name.startsWith("TikTokOrderID:"));
        // if (tiktokTag) {
        //   const tiktokOrderId = tiktokTag.name.split(":")[1];
        //   try {
        //     const tik = await fetchTikTokSummary(tiktokOrderId);
        //     structuredOrder.tiktokId = tik.order_id || tiktokOrderId;

        //     structuredOrder.trackingNumber = tik.tracking_numbers || [];
        //     structuredOrder.warehouseId=tik.warehouse_id;
        //     structuredOrder.status = "created";
        //   } catch (err) {
        //     console.warn(`⚠️ TikTok summary fetch failed for ${tiktokOrderId}`);
        //   }
        // }

        // allOrders.push(structuredOrder);
        if (trackingNumbers.length > 0) {
          allOrders.push(structuredOrder);
        }
      }
    }

    // Only insert new ones
    const existingOrders = await Order.find({
      OrderId: { $in: allOrders.map((o) => o.OrderId) },
    }).select("OrderId");

    const existingOrderIds = new Set(existingOrders.map((o) => o.OrderId));
    const newOrders = allOrders.filter(
      (order) => !existingOrderIds.has(order.OrderId)
    );

    if (newOrders.length > 0) {
      await Order.insertMany(newOrders);
    }

    console.log(`Inserted ${newOrders.length} new orders.`);
    res.status(200).json({
      message: "New orders inserted",
      insertedCount: newOrders.length,
    });
  } catch (error) {
    console.error(
      "❌ Error inserting orders:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to insert orders" });
  }
});

router.get("/api/orders/store/each-day", async (req, res) => {
  try {
    const pageSize = 100;
    const totalOrders = 1500;
    const totalPages = Math.ceil(totalOrders / pageSize);
    const allOrders = [];

    // Retry helper for TikTok API
    // const fetchTikTokSummary = async (orderId, retries = 7) => {
    //   const url = `http://localhost:3000/api/order/${orderId}/summary`;

    //   for (let i = 0; i < retries; i++) {
    //     try {
    //       const res = await axios.get(url);
    //       return res.data;
    //     } catch (err) {
    //       console.warn(`Retry ${i + 1} failed for ${orderId}`);
    //       if (i === retries - 1) throw err;
    //       await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
    //     }
    //   }
    // };

    for (let page = 1; page <= totalPages; page++) {
      const response = await axios.get(VEEQO_API_URL, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": VEEQO_API_KEY,
        },
        params: {
          page,
          page_size: pageSize,
          status: "shipped",
        },
      });

      const rawOrders = response.data;

      for (const order of rawOrders) {
        const allocations = order.allocations || [];

        const trackingNumbers = allocations
          .map((a) => a?.shipment?.tracking_number?.tracking_number)
          .filter(Boolean);

        const tags = (order.tags || []).map((tag) => ({
          name: tag.name || "",
        }));

        const structuredOrder = {
          id: String(order.id),
          OrderId: String(order.number),
          created_at: order.shipped_at || "",
          shipped_at: order.shipped_at || "",
          carrier_name:
            order.allocations?.[0]?.shipment?.service_carrier_name || "",
          customerName: order.customer?.full_name || "",
          address: order.customer?.billing_address?.address1 || "",
          trackingNumber: trackingNumbers,
          shipmentId:
            order.allocations?.[0]?.shipment?.tracking_number?.shipment_id ||
            "",
          trackingUrl: order.allocations?.[0]?.shipment?.tracking_url || "",
          status:
            order.allocations?.[0]?.shipment?.tracking_number?.status || "",
          tags,
          channelCode: order.channel?.type_code || "",
          channelName: order.channel?.name || "",
          items: (order.allocations || [])
            .flatMap((allocation) => allocation.line_items || [])
            .map((item) => {
              const sellable = item.sellable || {};
              return {
                sku: sellable.sku_code || "",
                quantity: item.quantity || 0,
                title: sellable.product_title || sellable.title || "",
                image: sellable.image_url || sellable.main_thumbnail_url || "",
              };
            }),
        };

        // ✅ Enrich TikTok data (if TikTokOrderID tag exists)
        // const tiktokTag = tags.find((t) => t.name.startsWith("TikTokOrderID:"));
        // if (tiktokTag) {
        //   const tiktokOrderId = tiktokTag.name.split(":")[1];
        //   try {
        //     const tik = await fetchTikTokSummary(tiktokOrderId);
        //     structuredOrder.tiktokId = tik.order_id || tiktokOrderId;

        //     structuredOrder.trackingNumber = tik.tracking_numbers || [];
        //     structuredOrder.warehouseId=tik.warehouse_id;
        //     structuredOrder.status = "created";
        //   } catch (err) {
        //     console.warn(`⚠️ TikTok summary fetch failed for ${tiktokOrderId}`);
        //   }
        // }

        // allOrders.push(structuredOrder);
        if (trackingNumbers.length > 0) {
          allOrders.push(structuredOrder);
        }
      }
    }

    // Only insert new ones
    const existingOrders = await Order.find({
      OrderId: { $in: allOrders.map((o) => o.OrderId) },
    }).select("OrderId");

    const existingOrderIds = new Set(existingOrders.map((o) => o.OrderId));
    const newOrders = allOrders.filter(
      (order) => !existingOrderIds.has(order.OrderId)
    );

    if (newOrders.length > 0) {
      await Order.insertMany(newOrders);
    }

    console.log(`Inserted ${newOrders.length} new orders.`);
    res.status(200).json({
      message: "New orders inserted",
      insertedCount: newOrders.length,
    });
  } catch (error) {
    console.error(
      "❌ Error inserting orders:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to insert orders" });
  }
});

router.get("/api/shipped/store", async (req, res) => {
  try {
    const pageSize = 50;
    const totalOrders = 100;
    const totalPages = Math.ceil(totalOrders / pageSize);
    const allOrders = [];

    // Retry helper for TikTok API
    // const fetchTikTokSummary = async (orderId, retries = 7) => {
    //   const url = `http://localhost:3000/api/order/${orderId}/summary`;

    //   for (let i = 0; i < retries; i++) {
    //     try {
    //       const res = await axios.get(url);
    //       return res.data;
    //     } catch (err) {
    //       console.warn(`Retry ${i + 1} failed for ${orderId}`);
    //       if (i === retries - 1) throw err;
    //       await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
    //     }
    //   }
    // };

    for (let page = 1; page <= totalPages; page++) {
      const response = await axios.get(VEEQO_API_URL, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": VEEQO_API_KEY,
        },
        params: {
          page,
          page_size: pageSize,
          status: "shipped",
        },
      });

      const rawOrders = response.data;

      for (const order of rawOrders) {
        const allocations = order.allocations || [];

        const trackingNumbers = allocations
          .map((a) => a?.shipment?.tracking_number?.tracking_number)
          .filter(Boolean);

        const tags = (order.tags || []).map((tag) => ({
          name: tag.name || "",
        }));

        const structuredOrder = {
          id: String(order.id),
          OrderId: String(order.number),
          created_at: order.shipped_at || "",
          shipped_at: order.shipped_at || "",
          carrier_name:
            order.allocations?.[0]?.shipment?.service_carrier_name || "",
          customerName: order.customer?.full_name || "",
          address: order.customer?.billing_address?.address1 || "",
          trackingNumber: trackingNumbers,
          shipmentId:
            order.allocations?.[0]?.shipment?.tracking_number?.shipment_id ||
            "",
          trackingUrl: order.allocations?.[0]?.shipment?.tracking_url || "",
          status:
            order.allocations?.[0]?.shipment?.tracking_number?.status || "",
          tags,
          channelCode: order.channel?.type_code || "",
          channelName: order.channel?.name || "",
          items: (order.allocations || [])
            .flatMap((allocation) => allocation.line_items || [])
            .map((item) => {
              const sellable = item.sellable || {};
              return {
                sku: sellable.sku_code || "",
                quantity: item.quantity || 0,
                title: sellable.product_title || sellable.title || "",
                image: sellable.image_url || sellable.main_thumbnail_url || "",
              };
            }),
        };

        // ✅ Enrich TikTok data (if TikTokOrderID tag exists)
        // const tiktokTag = tags.find((t) => t.name.startsWith("TikTokOrderID:"));
        // if (tiktokTag) {
        //   const tiktokOrderId = tiktokTag.name.split(":")[1];
        //   try {
        //     const tik = await fetchTikTokSummary(tiktokOrderId);
        //     structuredOrder.tiktokId = tik.order_id || tiktokOrderId;
        //     structuredOrder.warehouseId=tik.warehouse_id;
        //     structuredOrder.trackingNumber = tik.tracking_numbers || [];
        //     structuredOrder.status = "created";
        //   } catch (err) {
        //     console.warn(`⚠️ TikTok summary fetch failed for ${tiktokOrderId}`);
        //   }
        // }

        // allOrders.push(structuredOrder);
        if (trackingNumbers.length > 0) {
          allOrders.push(structuredOrder);
        }
      }
    }

    // Only insert new ones
    const existingOrders = await Order.find({
      OrderId: { $in: allOrders.map((o) => o.OrderId) },
    }).select("OrderId");

    const existingOrderIds = new Set(existingOrders.map((o) => o.OrderId));
    const newOrders = allOrders.filter(
      (order) => !existingOrderIds.has(order.OrderId)
    );

    if (newOrders.length > 0) {
      await Order.insertMany(newOrders);
    }

    console.log(`Inserted ${newOrders.length} new orders.`);
    res.status(200).json({
      message: "New orders inserted",
      insertedCount: newOrders.length,
    });
  } catch (error) {
    console.error(
      "❌ Error inserting orders:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to insert orders" });
  }
});

router.post("/api/tiktok/tracking", async (req, res) => {
  try {
    const { updates } = req.body;

    console.log("Received updates:", updates);
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Invalid or empty updates array." });
    }

    const updateMap = new Map();
    for (const entry of updates) {
      const { tiktokOrderId, trackingNumber } = entry;
      if (!tiktokOrderId || !trackingNumber) continue;

      if (!updateMap.has(tiktokOrderId)) {
        updateMap.set(tiktokOrderId, new Set());
      }
      updateMap.get(tiktokOrderId).add(trackingNumber);
    }

    const bulkOps = [];

    for (const [tiktokId, newTrackingNumbers] of updateMap.entries()) {
      const matchingOrders = await Order.find({
        "tags.name": { $regex: `TikTokOrderID:${tiktokId}` },
      });

      for (const order of matchingOrders) {
        const existingNumbers = Array.isArray(order.trackingNumber)
          ? order.trackingNumber
          : [];
        const mergedSet = new Set([...existingNumbers, ...newTrackingNumbers]);

        bulkOps.push({
          updateOne: {
            filter: { _id: order._id },
            update: {
              $set: {
                trackingNumber: Array.from(mergedSet),
                updatedAt: new Date(),
              },
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Order.bulkWrite(bulkOps);
    }

    res.json({
      message: `Updated ${bulkOps.length} order(s) with TikTok tracking numbers.`,
    });
  } catch (error) {
    console.error("❌ Error in /api/tiktok/tracking:", error.message);
    res
      .status(500)
      .json({ error: "Failed to update TikTok tracking numbers." });
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, config, retries = 3, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Retry ${attempt} failed. Retrying after ${delayMs}ms...`);
      await delay(delayMs * attempt);
    }
  }
};

router.get("/api/update-status", async (req, res) => {
  console.log("Starting status update from Veeqo shipping events...");
  try {
    const orders = await Order.find({
      shipmentId: { $exists: true, $ne: "" },
      status: { $nin: ["delivered", "resolved"] },
    }).lean();

    const bulkOps = [];

    for (const order of orders) {
      try {
        const response = await fetchWithRetry(
          `${SHIPPING_EVENTS_URL}/${order.shipmentId}`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": VEEQO_API_KEY,
            },
          }
        );
        const events = response.data;
        if (Array.isArray(events) && events.length > 0) {
          const lastEvent = events[events.length - 1];
          const latestStatus = lastEvent.status || "";

          if (latestStatus) {
            bulkOps.push({
              updateOne: {
                filter: { _id: order._id },
                update: {
                  $set: {
                    status: latestStatus,
                    updatedAt: new Date(),
                  },
                },
              },
            });
          }
        }
      } catch (err) {
        console.warn(
          `⚠️ Failed to update shipment ${order.shipmentId}: ${err.message}`
        );
      }

      await delay(500);
    }

    if (bulkOps.length > 0) {
      await Order.bulkWrite(bulkOps);
    }

    res.json({
      message: `Updated ${bulkOps.length} order statuses from Veeqo shipping events.`,
    });
  } catch (error) {
    console.error("Error in /api/update-status:", error.message);
    res.status(500).json({ error: "Failed to update statuses." });
  }
});

router.get("/api/orders-list", async (req, res) => {
  try {
    const {
      status,
      scanStatus,
      query,
      page = 1,
      limit = 100,
      startDate,
      endDate,
      tagType, // expected values: target | tiktok | temu | flip
    } = req.query;

    console.log("Fetching orders list with params:", req.query);

    const allOrders = await VTOrder.find().sort({ shipped_at: -1 }).lean();

    const scanOrders = await TrackScan.find().lean();
    const scanMap = new Map(scanOrders.map((scan) => [scan.orderId, scan]));

    // === FILTER: Status, Query, Date Range, Tag
    const filteredForResult = allOrders.filter((order) => {
      let matchesStatus = true;
      if (status) {
        const lowerStatus = order.status?.toLowerCase().trim();
        if (status === "tracking_issue") {
          matchesStatus = [
            "delayed",
            "cancelled",
            "contact_support",
            "recipient_refused",
            "returned_to_sender",
          ].includes(lowerStatus);
        } else {
          matchesStatus = lowerStatus === status;
        }
      }

      const matchesQuery = query
        ? (typeof order.OrderId === "string" &&
            order.OrderId.toLowerCase().includes(query.toLowerCase())) ||
          (Array.isArray(order.trackingNumber) &&
            order.trackingNumber.some((num) =>
              typeof num === "string"
                ? num.toLowerCase().includes(query.toLowerCase())
                : false
            )) ||
          (typeof order.trackingNumber === "string" &&
            order.trackingNumber.toLowerCase().includes(query.toLowerCase())) ||
          (typeof order.tiktokId === "string" &&
            order.tiktokId.toLowerCase().includes(query.toLowerCase()))
        : true;

      let matchesDateRange = true;
      if (startDate || endDate) {
        const shippedAt = new Date(order.shipped_at);
        const start = startDate ? new Date(startDate + "T00:00:00.000Z") : null;
        const end = endDate ? new Date(endDate + "T23:59:59.999Z") : null;

        if (start && shippedAt < start) matchesDateRange = false;
        if (end && shippedAt > end) matchesDateRange = false;
      }

      let matchesTag = true;
      if (tagType) {
        const tagNames = (order.tags || []).map((tag) =>
          tag.name.toLowerCase()
        );
        const channelNames = order.channelName;
        const hasTags = tagNames.length > 0;

        switch (tagType.toLowerCase()) {
          case "target":
            matchesTag =
              hasTags && tagNames.some((name) => name.includes("target"));
            break;
          case "tiktok":
            matchesTag = channelNames && channelNames.includes("tiktok");
            break;
          case "walmart":
            matchesTag = channelNames && channelNames.includes("Walmart");
            break;
          case "temu":
            matchesTag =
              hasTags && tagNames.some((name) => name.includes("temu"));
            break;
          case "flip":
            matchesTag =
              hasTags && tagNames.some((name) => name.includes("flip"));
            break;
          case "amazon":
            matchesTag = channelNames && channelNames.includes("amazon");
            break;
          case "ebay":
            matchesTag = channelNames && channelNames.includes("ebay");
            break;
          case "phone":
            matchesTag = channelNames && channelNames.includes("phone");
            break;
          case "syruvia":
            const knownTags = ["target", "temu"];
            const knownChannels = ["tiktok", "amazon", "ebay", "phone"];
            matchesTag = !(
              (hasTags &&
                tagNames.some((name) =>
                  knownTags.some((tag) => name.includes(tag))
                )) ||
              (channelNames &&
                knownChannels.some((ch) => channelNames.includes(ch)))
            );
            break;
          default:
            matchesTag = true;
        }

        if (!hasTags && order.channelName) {
          matchesTag = order.channelName
            .toLowerCase()
            .includes(tagType.toLowerCase());
        }
      }

      return matchesStatus && matchesQuery && matchesDateRange && matchesTag;
    });

    // === MERGE Scan Info
    const mergedOrders = filteredForResult.map((order) => {
      const scan = scanMap.get(order.OrderId);
      return {
        ...order,
        picked: scan?.picked || false,
        packed: scan?.packed || false,
        isPalette: scan?.isPalette || false,
        scanStatus: scan?.scanStatus || "pending",
        pickerName: scan?.pickerName || null,
        pickerRole: scan?.pickerRole || null,
        packerName: scan?.packerName || null,
        packerRole: scan?.packerRole || null,
        paletterName: scan?.paletterName || null,
        paletterRole: scan?.paletterRole || null,
        pickedAt: scan?.pickedAt || null,
        packedAt: scan?.packedAt || null,
        paletteAt: scan?.paletteAt || null,
        pickedTrackingNumbers: scan?.pickedTrackingNumbers || [],
        packedTrackingNumbers: scan?.packedTrackingNumbers || [],
        palleteTrackingNumbers: scan?.palleteTrackingNumbers || [],
        packedProduct: scan?.packedProduct || [],
        packedUPC: scan?.packedUPC || [],
        packNote: scan?.packNote || null,
      };
    });

    // === Scan Status Filter
    const scanFilteredOrders = scanStatus
      ? mergedOrders.filter(
          (order) =>
            order.scanStatus === scanStatus &&
            Array.isArray(order.trackingNumber) &&
            order.trackingNumber.length > 0
        )
      : mergedOrders;

    // === Count Function
    const calculateStatusCounts = (orders) => {
      const totalByScanStatus = {};
      const totalByStatus = {
        awaiting_collection: 0,
        in_transit: 0,
        delivered: 0,
        created: 0,
        out_for_delivery: 0,
        tracking_issue: 0,
      };

      for (const order of orders) {
        const scan = scanMap.get(order.OrderId);
        const scanStatusVal = scan?.scanStatus || "pending";
        const trackingNumber = order.trackingNumber || [];

        if (Array.isArray(trackingNumber) && trackingNumber.length > 0) {
          totalByScanStatus[scanStatusVal] =
            (totalByScanStatus[scanStatusVal] || 0) + 1;
        }

        const s = order.status?.toLowerCase().trim();
        if (s === "awaiting_collection") totalByStatus.awaiting_collection++;
        else if (s === "in_transit") totalByStatus.in_transit++;
        else if (s === "delivered") totalByStatus.delivered++;
        else if (s === "created") totalByStatus.created++;
        else if (s === "out_for_delivery") totalByStatus.out_for_delivery++;
        else if (
          [
            "delayed",
            "cancelled",
            "contact_support",
            "recipient_refused",
            "returned_to_sender",
          ].includes(s)
        ) {
          totalByStatus.tracking_issue++;
        }
      }

      return { totalByScanStatus, totalByStatus };
    };

    const isSearchOrDateFilter = query || startDate || endDate || tagType;
    const { totalByScanStatus, totalByStatus } = isSearchOrDateFilter
      ? calculateStatusCounts(scanFilteredOrders)
      : calculateStatusCounts(allOrders);

    // === PAGINATION
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedOrders = scanFilteredOrders.slice(
      startIndex,
      startIndex + parseInt(limit)
    );

    let totalOrdersCount = allOrders.length;
    if (isSearchOrDateFilter) {
      totalOrdersCount = scanFilteredOrders.length;
    }

    // === FINAL RESPONSE
    res.status(200).json({
      total: totalOrdersCount,
      totalByScanStatus,
      totalByStatus,
      products: paginatedOrders.length,
      result: paginatedOrders,
    });
  } catch (error) {
    console.error("Error fetching orders list:", error.message);
    res.status(500).json({ error: "Failed to fetch orders list" });
  }
});

router.get("/tiktok/callback", async (req, res) => {
  const { code, shop_region, locale } = req.query;
  console.log("req.query", req.query);
  console.log(process.env.TIKTOK_APP_KEY, process.env.TIKTOK_APP_SECRET);
  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const tokenRes = await axios.get(
      "https://auth.tiktok-shops.com/api/v2/token/get",
      {
        params: {
          app_key: process.env.TIKTOK_APP_KEY,
          app_secret: process.env.TIKTOK_APP_SECRET,
          auth_code: code, // not `code`, use `auth_code`
          grant_type: "authorized_code",
        },
      }
    );

    const data = tokenRes.data.data;
    if (!data || !data.access_token) {
      return res
        .status(500)
        .send(`Failed to get token: ${JSON.stringify(tokenRes.data)}`);
    }
    console.log(data);
    const accessTokenExpireAt = new Date(data.access_token_expire_in * 1000);
    const refreshTokenExpireAt = new Date(data.refresh_token_expire_in * 1000);

    await TikTokAuth.findOneAndUpdate(
      { open_id: data.open_id },
      {
        seller_name: data.seller_name,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        access_token_expire_at: accessTokenExpireAt,
        refresh_token_expire_at: refreshTokenExpireAt,
        shop_region: shop_region || "US",
        locale: locale || "en",
      },
      { upsert: true, new: true }
    );

    console.log(
      `Connected seller: ${data.seller_name} (open_id: ${data.open_id})`
    );
    return res.redirect(`https://fbm.priceobo.com/`);
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
    return res.status(500).send("Token exchange failed.");
  }
});

const TIKTOK_APP_KEY = process.env.TIKTOK_APP_KEY;
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET;

router.post("/api/tiktok/orders", async (req, res) => {
  try {
    const seller = await TikTokAuth.findOne({
      open_id: "X8pMhAAAAABbG8PzDyczhbbNrFLc5cq5twFc89QeZhzfZbvW9aBwfA",
    });

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    const accessToken = seller.access_token.trim(); // Trim whitespace
    const shopCipher = seller.open_id.trim();
    const timestamp = Math.floor(Date.now() / 1000);

    console.log(TIKTOK_APP_SECRET);
    // 🧪 Build correct sign string
    const signInput = `app_key${TIKTOK_APP_KEY}shop_cipher${shopCipher}timestamp${timestamp}`;
    const sign = crypto
      .createHmac("sha256", TIKTOK_APP_SECRET)
      .update(signInput)
      .digest("hex");

    // 🧪 Build request URL
    const url =
      `https://open-api.tiktokshop.com/order/202309/orders/search` +
      `?app_key=${TIKTOK_APP_KEY}&timestamp=${timestamp}&shop_cipher=${encodeURIComponent(
        shopCipher
      )}&sign=${sign}`;

    console.log("🔍 Debug:");
    console.log("signInput:", signInput);
    console.log("sign:", sign);
    console.log("URL:", url);

    const response = await axios.post(
      url,
      {
        page_size: 50,
        sort_field: "create_time",
        sort_order: "DESC",
      },
      {
        headers: {
          "x-tts-access-token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({ data: response.data });
  } catch (error) {
    console.error(
      "❌ TikTok order fetch failed:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to fetch TikTok orders",
      details: error.response?.data || error.message,
    });
  }
});

const APP_KEY = "6gi3nino9sia3";
const APP_SECRET = "18da778e456044d348a5ae6639dd519893d2db59";
const ACCESS_TOKEN =
  "TTP_ZV7O1gAAAAD0V4LL0M3BWwJ_BqxZWi3IUVozPrZtWmPSkeBNCLsvsf0RqNBThN8K3hAJTkJfYk-G20xRM2zSD_pFwwo0lqXxV9r1x9akx7GeQdvLHtEelNNOIx8tgOQZf9Kp5EBSdSg";
const BASE_URL = "https://open-api.tiktokglobalshop.com";
// const BASE_URL = "https://open-api.tiktokshop.com";

const generateSign = (uri, query, body, appSecret) => {
  const excludeKeys = ["access_token", "sign"];
  const sortedParams = Object.keys(query)
    .filter((key) => !excludeKeys.includes(key))
    .sort()
    .map((key) => `${key}${query[key]}`)
    .join("");

  const path = new URL(uri).pathname;
  let signString = `${path}${sortedParams}`;

  if (body && Object.keys(body).length > 0) {
    signString += JSON.stringify(body);
  }

  signString = `${appSecret}${signString}${appSecret}`;
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(signString);
  return hmac.digest("hex");
};

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1000;
function mapStatus(orderStatus) {
  switch (orderStatus) {
    case 111:
    case 112:
      return "awaiting_collection";
    case 121:
      return "in_transit";
    case 122:
    case 130:
      return "delivered";
    case 140:
      return "recipient_refused";
    default:
      return "unknown";
  }
}

async function Retry(tiktokOrderId) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/order/${tiktokOrderId}/summary`
      );

      if (response.data && response.data.order_id) {
        return response.data;
      }

      console.warn(`⚠️ Attempt ${attempt}: Empty or invalid data`);
    } catch (error) {
      const isDeprecationError = error?.response?.data?.message?.includes(
        "V1 API is being deprecated"
      );

      if (isDeprecationError) {
        console.warn(`⚠️ Attempt ${attempt}: API deprecated`);
      } else {
        console.warn(`⚠️ Attempt ${attempt}: ${error.message}`);
      }

      if (attempt === MAX_RETRIES) throw error;
    }

    await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
  }

  throw new Error(`❌ Failed to fetch TikTok summary for ${tiktokOrderId}`);
}

router.get("/api/tiktokorder/status", async (req, res) => {
  try {
    // const orders = await Order.find({
    //   tags: { $elemMatch: { name: /^TikTokOrderID:/ } },
    // });

    const orders = await TikTokOrder.find({
      trackingNumber: { $size: 0 },
      status: { $ne: "delivered" },
    }).lean();

    let updatedCount = 0;
    const updates = [];

    for (const order of orders) {
      const tiktokOrderId = order.OrderId;
      console.log(tiktokOrderId);
      try {
        const data = await Retry(tiktokOrderId);
        const {
          order_id,
          rts_time,
          tracking_numbers,
          order_status,
          warehouse_id,
        } = data;
        const shippedAtDate =
          rts_time && !isNaN(rts_time)
            ? new Date(rts_time * 1000).toISOString()
            : new Date().toISOString();
        const updated = await TikTokOrder.findByIdAndUpdate(
          order._id,
          {
            $set: {
              created_at: shippedAtDate,
              shipped_at: shippedAtDate,
              tiktokId: order_id,
              trackingNumber: tracking_numbers || [],
              warehouseId: warehouse_id,
              status: mapStatus(order_status),
            },
          },
          { new: true }
        );

        updates.push(updated);
        updatedCount++;
      } catch (err) {
        console.error(`Failed for ${tiktokOrderId}:`, err.message);
      }
    }

    res.json({
      updatedCount,
      message: `${updatedCount} TikTok orders updated in BackUp collection.`,
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to update TikTok order statuses." });
  }
});

router.get("/api/tiktokorder/update-status", async (req, res) => {
  try {
    // const orders = await Order.find({
    //   tags: { $elemMatch: { name: /^TikTokOrderID:/ } },
    // });

    const orders = await TikTokOrder.find({
      status: { $nin: ["delivered", "resolved"] },
    }).lean();

    let updatedCount = 0;
    const updates = [];

    for (const order of orders) {
      const tiktokOrderId = order.OrderId;
      console.log(tiktokOrderId);
      try {
        const data = await Retry(tiktokOrderId);
        const {
          order_id,
          rts_time,
          tracking_numbers,
          order_status,
          warehouse_id,
        } = data;
        const shippedAtDate =
          rts_time && !isNaN(rts_time)
            ? new Date(rts_time * 1000).toISOString()
            : new Date().toISOString();
        const updated = await TikTokOrder.findByIdAndUpdate(
          order._id,
          {
            $set: {
              created_at: shippedAtDate,
              shipped_at: shippedAtDate,
              tiktokId: order_id,
              trackingNumber: tracking_numbers || [],
              warehouseId: warehouse_id,
              status: mapStatus(order_status),
            },
          },
          { new: true }
        );

        updates.push(updated);
        updatedCount++;
      } catch (err) {
        console.error(`Failed for ${tiktokOrderId}:`, err.message);
      }
    }

    res.json({
      updatedCount,
      message: `${updatedCount} TikTok orders updated.`,
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to update TikTok order statuses." });
  }
});

router.get("/api/order/:orderId/summary", async (req, res) => {
  const orderId = req.params.orderId;
  if (!orderId) return res.status(400).json({ error: "Missing orderId" });

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/orders/detail/query";

    const body = {
      order_id_list: [orderId],
    };

    const queryParams = {
      app_key: APP_KEY,
      timestamp,
    };

    const sign = generateSign(
      `${BASE_URL}${path}`,
      queryParams,
      body,
      APP_SECRET
    );

    const query = new URLSearchParams({
      ...queryParams,
      sign,
      access_token: ACCESS_TOKEN,
    }).toString();

    const url = `${BASE_URL}${path}?${query}`;

    const detailRes = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
    });

    const order = detailRes.data?.data?.order_list?.[0];

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const trackingNumbers = Array.from(
      new Set(
        (order.order_line_list || [])
          .map((line) => line.tracking_number)
          .filter(Boolean)
      )
    );

    res.json({
      order_id: order.order_id,
      order_status: order.order_status,
      rts_time: order?.rts_time || order.update_time,
      warehouse_id: order.warehouse_id,
      tracking_numbers: trackingNumbers,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.response?.data || "Failed to fetch order summary" });
  }
});

// Retry helper
async function withRetry(fn, retries = 5, delay = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`🔁 Retry attempt ${attempt} failed: ${err.message}`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
const sanitizeStringStore = (value) => {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC") // Unicode-safe normalization
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // control chars
    .replace(/[\uD800-\uDFFF]/g, "") // invalid surrogate pairs
    .replace(/\uFFFD/g, "") // replacement char
    .trim();
};

router.post("/api/orders", async (req, res) => {
  try {
    let allOrders = [];
    let fullDetails = [];
    let pageToken = undefined;

    const MAX_PAGES = 1;
    const MAX_ORDERS = 50;
    let pageCount = 0;

    while (true) {
      if (pageCount >= MAX_PAGES || allOrders.length >= MAX_ORDERS) {
        console.log(
          `✅ Reached limit: ${pageCount} pages or ${allOrders.length} orders`
        );
        break;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const path = "/api/orders/search";

      const body = {
        page_size: 50,
        shipping_type: "SELLER",
        sort_field: "create_time",
        sort_order: "DESC",
        ...(pageToken ? { page_token: pageToken } : {}),
      };

      const queryParams = {
        app_key: APP_KEY,
        timestamp,
      };

      const sign = generateSign(
        `${BASE_URL}${path}`,
        queryParams,
        body,
        APP_SECRET
      );

      const queryStr = new URLSearchParams({
        ...queryParams,
        sign,
        access_token: ACCESS_TOKEN,
      }).toString();

      const url = `${BASE_URL}${path}?${queryStr}`;

      const orderListRes = await withRetry(() =>
        axios.post(url, body, {
          headers: { "Content-Type": "application/json" },
        })
      );

      const data = orderListRes.data?.data;
      const orders = data?.order_list || [];
      const nextToken = data?.next_cursor;
      const hasMore = data?.more;

      if (orders.length > 0) {
        allOrders.push(...orders);

        const detailBody = { order_id_list: orders.map((o) => o.order_id) };
        const detailTimestamp = Math.floor(Date.now() / 1000);
        const detailQuery = {
          app_key: APP_KEY,
          timestamp: detailTimestamp,
        };

        const sign2 = generateSign(
          `${BASE_URL}/api/orders/detail/query`,
          detailQuery,
          detailBody,
          APP_SECRET
        );

        const query2 = new URLSearchParams({
          ...detailQuery,
          sign: sign2,
          access_token: ACCESS_TOKEN,
        }).toString();

        const detailUrl = `${BASE_URL}/api/orders/detail/query?${query2}`;

        const detailsRes = await withRetry(() =>
          axios.post(detailUrl, detailBody, {
            headers: { "Content-Type": "application/json" },
          })
        );

        const detailedOrders = detailsRes.data?.data?.order_list || [];
        console.log(
          `📦 Got ${detailedOrders.length} detailed orders for page ${
            pageCount + 1
          }`
        );
        fullDetails.push(...detailedOrders);
      }

      if (!hasMore || !nextToken) {
        console.log("🚫 No more pages");
        break;
      }

      pageToken = nextToken;
      pageCount++;
      await new Promise((r) => setTimeout(r, 500)); // Throttle
    }

    // Insert only new orders
    let insertCount = 0;
    const seenOrderIds = new Set();

    for (let i = 0; i < fullDetails.length; i++) {
      const order = fullDetails[i];
      console.log(`${i} ${order.order_id}`);

      try {
        if (order?.warehouse_id !== "7275426401325893419") continue;

        if (!order?.order_id || seenOrderIds.has(order.order_id)) continue;
        seenOrderIds.add(order.order_id);

        const exists = await TikTokOrder.exists({ OrderId: order.order_id });
        if (exists) {
          console.log(`⏭️ Already exists: ${order.order_id}`);
          continue;
        }

        const trackingNumbers = Array.from(
          new Set(
            (order.order_line_list || [])
              .map((line) => line.tracking_number)
              .filter(Boolean)
          )
        );

        const items = (order.item_list || []).map((item) => ({
          sku: item.seller_sku || "",
          quantity: item.quantity || 1,
          title: item.product_name || "",
          image: item.sku_image || "",
        }));

        const orderDoc = {
          OrderId: order.order_id,
          id: order.order_id,
          shipped_at: order.shipped_time || "",
          carrier_name: order.shipping_provider || "",
          customerName: "",
          address: "",
          trackingNumber: trackingNumbers,
          tags: order.is_sample_order
            ? [{ name: "sample" }]
            : [{ name: "tiktok" }],
          channelCode: order.channel_code || "tiktok",
          channelName: order.channel_name || "tiktok",
          items,
          status: order.order_status || "UNKNOWN",
        };

        await TikTokOrder.create(orderDoc);
        insertCount++;
        console.log(`✅ Inserted order: ${order.order_id}`);
      } catch (err) {
        console.error(`❌ Error inserting ${order.order_id}:`, err.message);
      }
    }

    console.log(`✅ Total NEW orders inserted: ${insertCount}`);
    res.json({ inserted: insertCount, fetched: fullDetails });
  } catch (err) {
    console.error("❌ Fetch error:", err.response?.data || err.message);
    res
      .status(500)
      .json({ error: err.response?.data || "Failed to fetch orders" });
  }
});

// router.get("/api/merge/order", async (req, res) => {
//   try {
//     const vqOrders = await Order.find().sort({ created_at: -1 });
//     const ttOrders = await TikTokOrder.find().sort({ created_at: -1 });

//     let insertedCount = 0;
//     const allOrders = [...vqOrders, ...ttOrders];

//     for (const order of allOrders) {
//       const merged = {
//         OrderId: order.OrderId,
//         id: order.id || order.OrderId,
//         shipped_at: order.shipped_at || "",
//         created_at: order.created_at || "",
//         carrier_name: order.carrier_name || "",
//         customerName: order.customerName || "",
//         address: order.address || "",
//         trackingNumber: order.trackingNumber || [],
//         trackingUrl: order.trackingUrl || "",
//         shipmentId: order.shipmentId || "",
//         tags: order.tags || [],
//         channelCode: order.channelCode || "tiktok",
//         channelName: order.channelName || "tiktok",
//         items: order.items || [],
//         status: order.status || "",
//       };

//       await VTOrder.findOneAndUpdate(
//         { OrderId: merged.OrderId },
//         { $set: merged },
//         { upsert: true, new: true }
//       );

//       insertedCount++;
//     }

//     res.json({
//       message: `✅ Merged ${insertedCount} orders into VTOrder collection`,
//     });
//   } catch (error) {
//     console.error("❌ Merge error:", error.message);
//     res.status(500).json({ error: "Failed to merge orders" });
//   }
// });

const sanitizeString = (value) => {
  if (typeof value !== "string") return "";
  // Remove invalid surrogate pairs and non-UTF-8 characters
  return value
    .normalize("NFKD") // normalize to decompose characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // control chars
    .replace(/[\uD800-\uDFFF]/g, "") // remove surrogate pairs
    .replace(/[^\x00-\x7F]/g, ""); // remove non-ASCII (you may omit this if Unicode is OK)
};

router.get("/api/merge/order", async (req, res) => {
  try {
    console.log("merging");

    const vqOrders = await Order.find().sort({ shipped_at: -1 });

    // ⛔ Skip customerName and address from TikTokOrder
    const ttOrders = await TikTokOrder.find()
      .sort({ created_at: -1 })
      .select("-customerName -address");

    let insertedCount = 0;

    // ✅ Include all BackUp orders
    for (const order of vqOrders) {
      const merged = {
        OrderId: order.OrderId,
        id: order.id || order.OrderId,
        shipped_at: order.shipped_at || "",
        carrier_name: order.carrier_name || "",
        customerName: sanitizeString(order.customerName || ""),
        address: sanitizeString(order.address || ""),
        trackingNumber: order.trackingNumber || [],
        trackingUrl: order.trackingUrl || "",
        shipmentId: order.shipmentId || "",
        tags: order.tags || [],
        channelCode: order.channelCode || "",
        channelName: order.channelName || "",
        items: order.items || [],
        status: order.status || "",
      };

      await VTOrder.findOneAndUpdate(
        { OrderId: merged.OrderId },
        { $set: merged },
        { upsert: true, new: true }
      );

      insertedCount++;
    }

    // ✅ Include TikTokOrder orders ONLY if trackingNumber exists
    for (const order of ttOrders) {
      const hasTracking =
        Array.isArray(order.trackingNumber) && order.trackingNumber.length > 0;
      if (!hasTracking) continue;

      const merged = {
        OrderId: order.OrderId,
        id: order.id || order.OrderId,
        shipped_at: order.shipped_at || "",
        carrier_name: order.carrier_name || "",

        // ⛔ Skip customerName and address from merged result
        customerName: "",
        address: "",

        trackingNumber: order.trackingNumber || [],
        trackingUrl: order.trackingUrl || "",
        shipmentId: order.shipmentId || "",
        tags: order.tags || [],
        channelCode: "tiktok",
        channelName: "tiktok",
        items: order.items || [],
        status: order.status || "",
      };

      await VTOrder.findOneAndUpdate(
        { OrderId: merged.OrderId },
        { $set: merged },
        { upsert: true, new: true }
      );

      insertedCount++;
    }

    res.json({
      message: `✅ Merged ${insertedCount} orders into VTOrder collection`,
    });
  } catch (error) {
    console.error("❌ Merge error:", error.message);
    res.status(500).json({ error: "Failed to merge orders" });
  }
});

router.get("/api/tikok-orders", async (req, res) => {
  try {
    const result = await Order.find().sort({ createdAt: -1 });
    // .select("-customerName -address");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.put("/api/tiktok-orders/strip-sensitive", async (req, res) => {
  try {
    const result = await TikTokOrder.updateMany(
      {},
      {
        $unset: {
          customerName: "",
          address: "",
        },
      }
    );

    res.json({
      message: `✅ Removed customerName and address from ${result.modifiedCount} TikTok orders.`,
    });
  } catch (error) {
    console.error("❌ Failed to remove fields:", error.message);
    res.status(500).json({ error: "Failed to remove fields" });
  }
});

module.exports = router;
