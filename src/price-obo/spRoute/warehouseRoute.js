const express = require("express");
const router = express.Router();



const moment = require("moment-timezone");
const ReserveProduct = require("../../model/ReserveProduct");
const IssueScan = require("../../model/IssueScan");
const VTOrder = require("../../model/VTOrder");

const TrackScan = require("../../model/trackScan");

router.post("/api/upload/products", async (req, res) => {
  try {
    const products = req.body;
    console.log(products);
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty product list." });
    }

    const groupedBySku = {};

    for (const item of products) {
      const { sku, product, upc, qty } = item;
      console.log(sku);
      // if (!sku || !product || !upc || typeof qty !== "number") continue;
      if (!sku) continue;

      if (!groupedBySku[sku]) {
        groupedBySku[sku] = [];
      }

      groupedBySku[sku].push({ product, upc, qty });
    }

    for (const sku in groupedBySku) {
      const entries = groupedBySku[sku];

      let existingDoc = await ReserveProduct.findOne({ sku });
      console.log(existingDoc);
      if (!existingDoc) {
        // Create new document
        const newDoc = new ReserveProduct({
          sku,
          products: entries.map((p) => ({
            product: p.product,
            upc: p?.upc || "",
            qty: p?.qty || 0,
          })),
        });

        await newDoc.save();
      } else {
        // Update existing document smartly
        for (const entry of entries) {
          const { product, upc, qty } = entry;

          const existingProduct = existingDoc.products.find(
            (p) => p.product === product && p.upc === upc
          );

          if (existingProduct) {
            // Replace qty
            existingProduct.qty = qty;
          } else {
            // Push new entry
            existingDoc.products.push({
              product,
              upc,
              qty,
            });
          }
        }

        await existingDoc.save();
      }
    }

    res.status(200).json({
      message: "Smart bulk upload complete.",
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ error: "Failed to upload products." });
  }
});

router.get("/api/reserve-products", async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {};

    if (search) {
      filter.sku = { $regex: search, $options: "i" }; // case-insensitive search
    }

    const result = await ReserveProduct.find(filter).sort({ createdAt: -1 }); // only works if you added timestamps to schema

    res.json(result);
  } catch (error) {
    console.error("Reserve product fetch error:", error);
    res.status(500).json({ error: "Failed to fetch reserve products." });
  }
});

router.post("/api/merge-to-product", async (req, res) => {
  try {
    // Step 1: Get all VTOrder items
    const orders = await VTOrder.find({}, { items: 1 });

    // Step 2: Extract all unique SKUs from order items
    const allSkus = new Set();
    for (const order of orders) {
      for (const item of order.items || []) {
        if (item.sku) {
          allSkus.add(item.sku.trim());
        }
      }
    }

    const newSkus = [];

    // Step 3: For each SKU, check if it exists in ReserveProduct
    for (const sku of allSkus) {
      const exists = await ReserveProduct.exists({ sku });

      if (!exists) {
        await ReserveProduct.create({ sku, products: [] });
        newSkus.push(sku);
      }
    }

    res.json({
      message: `Merged ${newSkus.length} new SKUs into ReserveProduct.`,
      newSkus,
    });
  } catch (error) {
    console.error("Merge error:", error);
    res.status(500).json({ error: "Failed to merge SKUs to ReserveProduct." });
  }
});

router.put("/api/reserve-product/:product/update", async (req, res) => {
  try {
    const { product } = req.params;
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No data provided for update." });
    }

    const result = await ReserveProduct.updateOne({ product }, { $set: data });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.status(200).json({
      message: "Product updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/api/product-scan/:upc", async (req, res) => {
  const upc = req.params.upc;
  const trackingNumber = req.query.trackingNumber;

  if (!trackingNumber) {
    return res
      .status(400)
      .json({ message: "Tracking Number is required in query." });
  }

  try {
    const vtOrder = await VTOrder.findOne({ trackingNumber });
    console.log(vtOrder);
    if (!vtOrder || !vtOrder.items || vtOrder.items.length === 0) {
      return res
        .status(404)
        .json({ message: "No items found for this tracking number." });
    }

    
    const backUpScan = await TrackScan.findOne({
      pickedTrackingNumbers: trackingNumber,
    });

    if (!backUpScan) {
      return res
        .status(404)
        .json({ message: "No Scan found for this tracking number." });
    }

    // 3. Prevent duplicate UPC scan
    if (backUpScan.packedUPC?.includes(upc)) {
      return res.status(400).json({
        message: `This UPC already scanned for this tracking number.`,
      });
    }

    let foundProduct = null;

   
    for (const item of vtOrder.items) {
      const sku = item.sku;

      const reserve = await ReserveProduct.findOne({ sku });
      if (!reserve || !reserve.products) continue;

      const match = reserve.products.find((p) => p.upc === upc);
      if (match) {
        foundProduct = match.product;
        break; 
      }
    }

    if (!foundProduct) {
      return res
        .status(404)
        .json({ message: "UPC not matched in any SKU's reserve." });
    }

    backUpScan.packedUPC = backUpScan.packedUPC || [];
    backUpScan.packedProduct = backUpScan.packedProduct || [];

    backUpScan.packedUPC.push(upc);
    backUpScan.packedProduct.push(foundProduct);
    backUpScan.scanproductAt = new Date();

    await backUpScan.save();

    return res.status(200).json({
      message: "UPC scanned!",
      scan: backUpScan,
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

router.post("/api/product/:trackingId/issue", async (req, res) => {
  const { trackingId } = req.params;

  if (!trackingId) {
    return res.status(400).json({ error: "Tracking ID is required" });
  }

  try {
    const order = await VTOrder.findOne({ trackingNumber: trackingId });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found for this tracking ID" });
    }

    const existing = await IssueScan.findOne({ trackingNumber: trackingId });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Issue already exists for this tracking number" });
    }
    const issueDoc = new IssueScan({
      OrderId: order.OrderId,
      trackingNumber: order.trackingNumber,
      items: order.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        title: item.title,
        image: item.image,
      })),
    });

    await issueDoc.save();
    await TrackScan.findOneAndUpdate(
      { trackingNumber: trackingId },
      { $set: { issue: true } }
    );
    res.status(201).json({
      message: "Issue created!",
      issue: issueDoc,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/reserve-product/:sku/sku",async(req,res)=>{
  const {sku} = req.params;
  try {
    const result = await ReserveProduct.find({sku});
    res.json({result});
  } catch (error) {
    console.log(error);
  }
})
router.get("/api/product/issue", async (req, res) => {
  try {
    const { resolved, search, startDate, endDate } = req.query;

    const filter = {};

    // Apply resolved filter
    if (resolved === "true") {
      filter.resolved = true;
    } else if (resolved === "false") {
      filter.resolved = false;
    }

    // Apply search filter on caseId, trackingId, items.sku
    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive match
      filter.$or = [
        { caseId: regex },
        { trackingNumber: regex },
        { "items.sku": regex },
        { OrderId: regex },
      ];
    }

    
    if (startDate && endDate) {
        const res = await IssueScan.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      
      });
      console.log(res);
    }

    // Get filtered results
    const result = await IssueScan.find(filter).sort({ createdAt: -1 });

    // Global counts (independent of search)
    const resolvedCount = await IssueScan.countDocuments({ resolved: true });
    const unresolvedCount = await IssueScan.countDocuments({ resolved: false });

    const total = resolvedCount + unresolvedCount;

    res.json({
      quantity: total,
      resolvedCount,
      unresolvedCount,
      result
    });
  } catch (error) {
    console.error("Issue fetch error:", error);
    res.status(500).json({ error: "Failed to fetch issues." });
  }
});

router.put("/api/product/issue/:id/stock", async (req, res) => {
  const { id } = req.params;
  const { stockOut } = req.body; // expecting boolean: true or false

  try {
    const result = await IssueScan.updateOne(
      { _id: id },
      {
        $set: {
          stockOut: stockOut,
          resolved: !stockOut,
          whNote: stockOut ? "Out of Stock" : "In Stock",
        },
      }
    );

    res.json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/api/product/issue/:id/status", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const result = await IssueScan.updateOne(
      { _id: id },
      {
        $set: {
          ...data,
          resolved: true,
        },
      }
    );

    res.json({ result });
  } catch (error) {
    console.log(error);
  }
});


router.put("/api/product/stock-check/:sku/sku/:id", async (req, res) => {
  const { sku, id } = req.params;
  const updatedProduct = req.body; // { upc, qty, stock }
  console.log(req.body);
  try {
    const result = await IssueScan.updateOne(
      { _id: id, "items.sku": sku },
      {
        $set: {
          "products.$.sku":updatedProduct.sku,
          "products.$.product":updatedProduct.product,
          "products.$.upc": updatedProduct.upc,
          "products.$.qty": updatedProduct.qty,
          "products.$.stock": updatedProduct.stock,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Product not found or not updated." });
    }

    res.json({ message: `Product ${sku} updated successfully in IssueScan ${id}`, result });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;