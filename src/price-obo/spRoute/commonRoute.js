const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const NodeCache = require("node-cache");
const multer = require("multer");
const csv = require("csv-parser");
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
    const dynamicCreatedAtMin = created_at_min || moment().subtract(30, "days").format("YYYY-MM-DD HH:mm:ss");
    const params = {
      status,
      page,
      page_size,
      created_at_min:dynamicCreatedAtMin,
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
  const { query, role } = req.query;

  if (!query || !role) {
    return res.status(400).json({ error: "query and user role are required" });
  }

  let trackingNumber = query.trim();
  if (!trackingNumber.startsWith("1Z") && !trackingNumber.startsWith("TBA")) {
    trackingNumber = trackingNumber.slice(-22);
  }
  console.log(query, " ..convert to.. ", trackingNumber);
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

    const order = response.data[0]; // Assume first match
    if (!order) {
      return res.status(404).json({ error: "Order not found in Veeqo" });
    }

    const { id: orderId } = order;

    let existingScan = await ScanOrder.findOne({ orderId });

    if (role === "picker") {
      if (!existingScan) {
        existingScan = await ScanOrder.create({
          orderId,
          trackingNumber,
          picked: true,
          packed: false,
          scanStatus: "picked",
        });
      } else {
        existingScan.picked = true;
        existingScan.scanStatus = "picked";
        await existingScan.save();
      }
      return res.json({
        message: "Picked scan recorded",
        order,
        scanStatus: existingScan,
      });
    }

    if (role === "packer") {
      // Packer can only scan after picker
      if (!existingScan || !existingScan.picked) {
        return res.status(400).json({ error: "Cannot pack before pick" });
      }
      if (existingScan.packed) {
        return res.status(400).json({ error: "Already packed" });
      }

      existingScan.packed = true;
      existingScan.scanStatus = "packed";
      await existingScan.save();

      return res.json({
        message: "Packed scan recorded",
        order,
        scanStatus: existingScan,
      });
    }

    return res.status(400).json({ error: "Invalid user Role" });
  } catch (error) {
    console.error("Scan error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to process scan" });
  }
});

router.get("/api/order/:order_id", async (req, res) => {
  const { order_id } = req.params;

  if (!order_id) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  try {
    const response = await axios.get(
      `https://api.veeqo.com/orders/#${order_id}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": VEEQO_API_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error fetching order details:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

module.exports = router;
