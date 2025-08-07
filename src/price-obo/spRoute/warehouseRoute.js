const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");

const moment = require("moment-timezone");
const ReserveProduct = require("../../model/ReserveProduct");
const IssueScan = require("../../model/IssueScan");
const VTOrder = require("../../model/VTOrder");

const TrackScan = require("../../model/trackScan");
const FBMUser = require("../../model/fbmUser");
const sendIssueAlertEmail = require("../../service/IssueEmailService");
const CaseScan = require("../../model/CaseScan");
const ProductUpc = require("../../model/ProductUpc");
const Order = require("../../model/Order");
const TikTokOrder = require("../../model/TikTokOrder");

router.post("/api/upload/products", async (req, res) => {
  try {
    const products = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty product list." });
    }

    const groupedBySku = {};

    for (const item of products) {
      const { sku, product, upc, qty } = item;
      if (!sku || !product) continue;

      if (!groupedBySku[sku]) {
        groupedBySku[sku] = new Map(); // Use Map to prevent duplicate products
      }

      if (!groupedBySku[sku].has(product)) {
        groupedBySku[sku].set(product, { product, upc, qty });
      }
    }

    for (const sku in groupedBySku) {
      const entries = Array.from(groupedBySku[sku].values());

      let existingDoc = await ReserveProduct.findOne({ sku });

      if (!existingDoc) {
        const newDoc = new ReserveProduct({
          sku,
          products: entries,
        });
        await newDoc.save();
      } else {
        for (const entry of entries) {
          const { product, upc, qty } = entry;

          const existingProduct = existingDoc.products.find(
            (p) => p.product === product
          );

          if (existingProduct) {
            existingProduct.qty = qty;
            existingProduct.upc = upc;
          } else {
            existingDoc.products.push({ product, upc, qty });
          }
        }
        await existingDoc.save();
      }
    }

    res.status(200).json({
      message: "Smart bulk upload complete. Duplicates per SKU avoided.",
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ error: "Failed to upload products." });
  }
});

router.put("/api/reserve-product/clean", async (req, res) => {
  try {
    const allDocs = await ReserveProduct.find();

    let cleanedCount = 0;

    for (const doc of allDocs) {
      const seen = new Set();
      const uniqueProducts = [];

      for (const p of doc.products) {
        const key = `${p.product}-${p.upc}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueProducts.push(p);
        }
      }

      // If cleanup is needed, update document
      if (uniqueProducts.length !== doc.products.length) {
        doc.products = uniqueProducts;
        await doc.save();
        cleanedCount++;
      }
    }

    res.json({
      message: `Cleanup complete!`,
      cleanedSkus: cleanedCount,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res
      .status(500)
      .json({ error: "Failed to clean duplicate product entries." });
  }
});

router.get("/api/reserve-products", async (req, res) => {
  try {
    const { search, missingUpc } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { sku: { $regex: search, $options: "i" } },
        { "products.product": { $regex: search, $options: "i" } },
        { "products.upc": { $regex: search, $options: "i" } },
      ];
    }

    if (missingUpc === "true") {
      filter.$or = [
        { products: { $size: 0 } }, // Empty products array
        {
          products: {
            $elemMatch: {
              $or: [{ upc: "" }, { upc: { $exists: false } }, { upc: null }],
            },
          },
        },
      ];
    }

    const result = await ReserveProduct.find(filter).sort({ createdAt: -1 });
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

router.put(
  "/api/reserve-product/:sku/sku/:product/update",
  async (req, res) => {
    const { sku, product } = req.params;
    const { qty, upc, product: newProduct } = req.body;
    console.log(sku, product);
    try {
      const result = await ReserveProduct.updateOne(
        { sku, "products.product": product },
        {
          $set: {
            ...(qty !== undefined && { "products.$.qty": qty }),
            ...(upc && { "products.$.upc": upc }),
            ...(newProduct && { "products.$.product": newProduct }),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "Product not found or no changes made." });
      }

      res.json({ message: "Product updated successfully.", result });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

router.post("/api/sku-to-product", async (req, res) => {
  try {
    const allReserves = await ReserveProduct.find();

    const seenProducts = new Set();
    const bulkOps = [];

    for (const reserve of allReserves) {
      for (const item of reserve.products) {
        const { product, upc, qty } = item;

        if (!product || !upc || qty === undefined) continue;

        if (seenProducts.has(product)) continue;
        seenProducts.add(product);

        bulkOps.push({
          updateOne: {
            filter: { product },
            update: { $set: { upc, qty } },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length === 0) {
      return res
        .status(200)
        .json({ message: "No unique products found to upsert." });
    }

    const result = await ProductUpc.bulkWrite(bulkOps);

    res.json({
      message: "Successfully synced!",
      upserts: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync products." });
  }
});

router.post("/api/product-upc/upload", async (req, res) => {
  const data = req.body;

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ message: "Invalid or empty data array" });
  }

  try {
    // Extract unique products from incoming data
    const incomingProducts = [
      ...new Set(data.map((item) => item.product).filter(Boolean)),
    ];

    // Check if any of those products already exist
    const existing = await ProductUpc.find({
      product: { $in: incomingProducts },
    });

    if (existing.length > 0) {
      const existingNames = existing.map((p) => p.product);
      return res.status(400).json({
        message: "One or more products already exist.",
        existingProducts: existingNames,
      });
    }

    // Proceed with bulk upload
    const bulkOps = [];

    data.forEach(({ product, upc }) => {
      if (!product || !upc) return;

      bulkOps.push({
        updateOne: {
          filter: { product, upc },
          update: { $setOnInsert: { product, upc } },
          upsert: true,
        },
      });
    });

    const result = await ProductUpc.bulkWrite(bulkOps);

    res.json({
      message: "Added successful!",
      result,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ message: "Bulk upload failed", error });
  }
});

router.get("/api/product-upc", async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {};

    if (search) {
      // Search in both `product` and `upc` fields using OR
      filter.$or = [
        { product: { $regex: search, $options: "i" } },
        { upc: { $regex: search, $options: "i" } },
      ];
    }

    const result = await ProductUpc.find(filter);
    res.json({ result });
  } catch (error) {
    console.error("Error fetching product-upc:", error);
    res.status(500).json({ error: "Failed to fetch data." });
  }
});

router.get("/api/product-upc/product/:product", async (req, res) => {
  try {
    const { product } = req.params;

    const result = await ProductUpc.findOne({ product });
    const upc = result?.upc;
    if (!upc) {
      return res.json({ message: "Product not found!" });
    }
    if (upc) {
      res.json({ upc });
    }
  } catch (error) {
    console.error("Error fetching product-upc:", error);
    res.status(500).json({ error: "Failed to fetch data." });
  }
});
router.delete("/api/product-upc/product/:product", async (req, res) => {
  try {
    const { product } = req.params;
    const result = await ProductUpc.findOneAndDelete({ product });
    res.json({ message: "Deleted!" });
  } catch (error) {
    res.json({ error });
  }
});
router.put("/api/product-upc/:product/product", async (req, res) => {
  const { product } = req.params;
  const { upc } = req.body;

  if (!product || !upc) {
    return res.status(400).json({ error: "Missing product, upc" });
  }

  try {
    // Update embedded products in ReserveProduct
    const reserveResult = await ReserveProduct.updateMany(
      { "products.product": product },
      {
        $set: {
          "products.$[elem].upc": upc,
        },
      },
      {
        arrayFilters: [{ "elem.product": product }],
      }
    );

    // Update flat ProductUpc entries
    const upcResult = await ProductUpc.updateMany(
      { product },
      {
        $set: {
          upc,
        },
      }
    );

    res.json({
      message: `Updated product '${product}' in ReserveProduct and ProductUpc.`,
      reserveModifiedCount: reserveResult.modifiedCount,
      productUpcModifiedCount: upcResult.modifiedCount,
    });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete(
  "/api/reserve-product/:sku/sku/:product/delete",
  async (req, res) => {
    const { sku, product } = req.params;

    try {
      const result = await ReserveProduct.updateOne(
        { sku },
        { $pull: { products: { product } } }
      );

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "No matching product found to delete." });
      }

      res.json({
        message: "Product removed successfully from the array.",
        result,
      });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

router.delete("/api/reserve-product/sku/:sku/delete", async (req, res) => {
  const { sku } = req.params;

  try {
    const result = await ReserveProduct.deleteOne({ sku });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "No document found with this SKU." });
    }

    res.json({ message: `SKU '${sku}' deleted successfully.`, result });
  } catch (error) {
    console.error("Delete by SKU error:", error);
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
      return res.status(404).json({ message: "Not Picked Yet!." });
    }

    // 3. Prevent duplicate UPC scan
    if (backUpScan.packedUPC?.includes(upc)) {
      return res.status(400).json({
        message: `This UPC already scanned!.`,
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
      return res.status(404).json({ message: "UPC not matched!." });
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

router.get("/api/reserve-product/:sku/sku", async (req, res) => {
  const { sku } = req.params;
  try {
    const result = await ReserveProduct.find({ sku });
    res.json({ result });
  } catch (error) {
    console.log(error);
  }
});
router.get("/api/product/issue", async (req, res) => {
  try {
    const {
      resolved,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};

    if (resolved === "true") {
      filter.resolved = true;
    } else if (resolved === "false") {
      filter.resolved = false;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { caseId: regex },
        { trackingNumber: regex },
        { "items.sku": regex },
        { OrderId: regex },
      ];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.createdAt = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const result = await CaseScan.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await CaseScan.countDocuments(filter);
    const hasMore = skip + result.length < totalCount;

    const resolvedCount = await CaseScan.countDocuments({ resolved: true });
    const unresolvedCount = await CaseScan.countDocuments({ resolved: false });
    const total = resolvedCount + unresolvedCount;

    res.json({
      quantity: total,
      resolvedCount,
      unresolvedCount,
      result,
      currentPage: parseInt(page),
      totalCount,
      hasMore,
    });
  } catch (error) {
    console.error("Issue fetch error:", error);
    res.status(500).json({ error: "Failed to fetch issues." });
  }
});

router.put("/api/product/issue/:id/stock", async (req, res) => {
  const { id } = req.params;
  const { stockOut, whUser, email, password } = req.body;
  console.log(req.body);
  try {
    if (!email || !password) {
      return res.status("Missing Password!");
    }
    const user = await FBMUser.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid password" });

    const result = await CaseScan.updateOne(
      { _id: id },
      {
        $set: {
          stockOut: stockOut,
          resolved: !stockOut,
          whNote: stockOut ? "Out of Stock" : "In Stock",
          whUser: whUser,
          whDate: new Date(),
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
    const { email, password } = data;
    if (!email || !password) {
      return res.status("Missing Password!");
    }
    const user = await FBMUser.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid password" });
    const result = await CaseScan.updateOne(
      { _id: id },
      {
        $set: {
          ...data,
          resolved: true,
          officeDate: new Date(),
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
    const result = await CaseScan.updateOne(
      { _id: id, "items.sku": sku },
      {
        $set: {
          "products.$.sku": updatedProduct.sku,
          "products.$.product": updatedProduct.product,
          "products.$.upc": updatedProduct.upc,
          "products.$.qty": updatedProduct.qty,
          "products.$.stock": updatedProduct.stock,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "Product not found or not updated." });
    }

    res.json({
      message: `Product ${sku} updated successfully in IssueScan ${id}`,
      result,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/product-scan/:trackingId/case", async (req, res) => {
  const { trackingId } = req.params;
  const { userName } = req.body;
  if (!trackingId) {
    return res.status(400).json({ error: "Tracking ID is required" });
  }
  let trackingNumber = trackingId.trim();

  if (!trackingNumber.startsWith("1Z") && !trackingNumber.startsWith("TBA")) {
    trackingNumber = trackingNumber.replace(/\D/g, "").slice(-22);
  }
  if (!userName) {
    return res.status(404).json({ error: "User not found!" });
  }
  try {
    // Find VTOrder by trackingNumber
    const order = await VTOrder.findOne({ trackingNumber: trackingNumber });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found for this tracking ID" });
    }

    // Prevent duplicate IssueScan
    const existing = await CaseScan.findOne({ trackingNumber: trackingNumber });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Issue already exists for this tracking number" });
    }

    // Prepare items
    const items = order.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      title: item.title,
      image: item.image,
    }));

    // Get and merge ReserveProduct data for each SKU
    const allProducts = [];
    for (const item of items) {
      const reserve = await ReserveProduct.findOne({ sku: item.sku });

      if (reserve && Array.isArray(reserve.products)) {
        for (const p of reserve.products) {
          allProducts.push({
            sku: item.sku,
            product: p.product,
            upc: p.upc,
            qty: p.qty,
          });
        }
      }
    }

    // Create new IssueScan document
    const issueDoc = new CaseScan({
      OrderId: order.OrderId,
      trackingNumber: order.trackingNumber,
      items,
      products: allProducts, // ← Inject here
      caseUser: userName || "Unknown",
    });

    await issueDoc.save();
    await sendIssueAlertEmail(
      [
        "ew@brecx.com",
        "bryanr.brecx@gmail.com",
        "pm@brecx.com",
        "cr@brecx.com",
      ],
      `❗New Case Created - Order ${order.OrderId}`,
      `Issue for Tracking: ${trackingNumber}\nOrder ID: ${order.OrderId}`,
      `<h3>New Issue Created</h3><p><strong>Order:</strong> ${order.OrderId}</p><p><strong>Tracking:</strong> ${trackingNumber}</p>`
    );

    await TrackScan.findOneAndUpdate(
      { trackingNumber: trackingNumber },
      { $set: { issue: true } }
    );

    res.status(201).json({
      message: "Issue created!",
      issue: issueDoc,
    });
  } catch (error) {
    console.error("Error creating issue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/product-scan/:_id/issue/:product", async (req, res) => {
  const { _id, product } = req.params;
  console.log(_id, product);
  const { stock } = req.body; // true or false
  console.log(stock);
  if (typeof stock !== "boolean") {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'stock' value in body." });
  }

  try {
    const updated = await CaseScan.updateOne(
      { _id, "products.product": product },
      { $set: { "products.$.stock": stock } }
    );

    if (updated.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "No matching product found to update." });
    }

    res.status(200).json({
      message: `Stock updated for product ${product} in Order`,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update product stock." });
  }
});

// pallete scan

router.get("/api/pallete-scan", async (req, res) => {
  const { query, role, userName } = req.query;

  try {
    let trackingNumber = query.trim();
    console.log(trackingNumber);
    if (!trackingNumber.startsWith("1Z") && !trackingNumber.startsWith("TBA")) {
      trackingNumber = trackingNumber.replace(/\D/g, "").slice(-22);
    }

    const order1 = await VTOrder.findOne({ trackingNumber });

    console.log("Order found:", order1);
    if (!order1) {
      return res.status(404).json({ error: "Order not found!" });
    }

    const { OrderId: orderId } = order1;

    let existingScan = await TrackScan.findOne({ orderId });
    if (role === "packer") {
      // Packer can only scan after picker
      if (!existingScan || !existingScan.packed) {
        return res.status(400).json({ error: "Cannot Pallete before pack" });
      }
      if (existingScan.palleteTrackingNumbers?.includes(trackingNumber)) {
        return res.status(400).json({ error: "Already On Pallete." });
      }
      existingScan.palleteTrackingNumbers.push(trackingNumber);
      existingScan.paletterName = userName;
      existingScan.paletterRole = role;
      existingScan.isPalette = true;
      existingScan.scanStatus = "palette";
      existingScan.paletteAt = new Date();
      await existingScan.save();

      return res.json({
        message: "Successfully Palette!",
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

router.post("/api/bulk/pallete-scan", async (req, res) => {
  try {
    const { email, password, userName, role, trackingNumbers = [] } = req.body;

    if (
      !email ||
      !password ||
      !role ||
      !userName ||
      !Array.isArray(trackingNumbers)
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
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
      if (role === "packer") {
        if (!existingScan || !existingScan.packed) {
          results.push({
            trackingNumber,
            status: "not_ready",
            message: "Cannot Pallete before pack",
          });
        } else {
          if (!existingScan.packedTrackingNumbers.includes(trackingNumber)) {
            results.push({
              trackingNumber,
              status: "not_packed",
              message: "This tracking number wasn't packed",
            });
            continue;
          }

          if (!existingScan.palleteTrackingNumbers)
            existingScan.palleteTrackingNumbers = [];

          if (existingScan.palleteTrackingNumbers.includes(trackingNumber)) {
            results.push({
              trackingNumber,
              status: "already_Pallete",
              message: "Already Pallete",
            });
          } else {
            existingScan.palleteTrackingNumbers.push(trackingNumber);

            const allPallete = existingScan.trackingNumber.every((t) =>
              existingScan.palleteTrackingNumbers.includes(t)
            );

            if (allPallete) {
              existingScan.isPalette = true;
              existingScan.scanStatus = "palette";
              existingScan.paletteAt = new Date();
            }

            existingScan.paletterName = userName;
            existingScan.paletterRole = role;
            await existingScan.save();

            results.push({
              trackingNumber,
              status: "Pallete",
              message: "Successfully Pallete",
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

router.put("/api/update/status/:trackingNumber", async (req, res) => {
  const { trackingNumber } = req.params;
  const { status, email, password } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const user = await FBMUser.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid password" });
    const backUpResult = await Order.findOneAndUpdate(
      { trackingNumber: { $in: [trackingNumber] } },
      { status },
      { new: true }
    );

    const backUpVTResult = await VTOrder.findOneAndUpdate(
      { trackingNumber: { $in: [trackingNumber] } },
      { status },
      { new: true }
    );

    const ttResult = await TikTokOrder.findOneAndUpdate(
      { trackingNumber: { $in: [trackingNumber] } },
      { status },
      { new: true }
    );

    if (!backUpResult && !backUpVTResult && !ttResult) {
      return res.status(404).json({
        message: `No product found with trackingNumber: ${trackingNumber}`,
      });
    }

    res.json({
      message: "Status updated successfully",
      updatedIn: {
        Order: backUpResult ? "Updated" : "Not Found",
        VTOrder: backUpVTResult ? "Updated" : "Not Found",
        TikTokOrder: ttResult ? "Updated" : "Not Found",
      },
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res
      .status(500)
      .json({ message: "Failed to update status", error: error.message });
  }
});

router.delete("/api/orders/delivered-last-30-days", async (req, res) => {
  const cutoffISO = moment().subtract(30, "days").toISOString();

  try {
    // 1) Find candidate orders in BackUp, BackUpVTOrder, TikTokOrder
    //    We only need BackUp + TikTokOrder tracking numbers for BackUpScan matching,
    //    but we also delete old delivered orders from BackUpVTOrder as well.
    const [oldBackups, oldVTOrders, oldTikTokOrders] = await Promise.all([
      Order.find(
        { status: "delivered", shipped_at: { $lte: cutoffISO } },
        { OrderId: 1, trackingNumber: 1 }
      ).lean(),
      VTOrder.find(
        { status: "delivered", shipped_at: { $lte: cutoffISO } },
        { OrderId: 1 }
      ).lean(),
      TikTokOrder.find(
        { status: "delivered", shipped_at: { $lte: cutoffISO } },
        { OrderId: 1, trackingNumber: 1 }
      ).lean(),
    ]);

    // 2) Build a unique set of tracking numbers from BackUp + TikTokOrder
    const trackingSet = new Set();
    for (const doc of oldBackups) {
      (doc.trackingNumber || []).forEach(
        (tn) => tn && trackingSet.add(String(tn))
      );
    }
    for (const doc of oldTikTokOrders) {
      (doc.trackingNumber || []).forEach(
        (tn) => tn && trackingSet.add(String(tn))
      );
    }
    for (const doc of oldVTOrders) {
      (doc.trackingNumber || []).forEach(
        (tn) => tn && trackingSet.add(String(tn))
      );
    }
    const trackingNumbers = Array.from(trackingSet);

    // 3) Delete from all 4 collections
    const [
      backUpDeleteResult,
      backUpVTDeleteResult,
      tikTokDeleteResult,
      backUpScanDeleteResult,
    ] = await Promise.all([
      Order.deleteMany({
        status: "delivered",
        shipped_at: { $lte: cutoffISO },
      }),
      VTOrder.deleteMany({
        status: "delivered",
        shipped_at: { $lte: cutoffISO },
      }),
      TikTokOrder.deleteMany({
        status: "delivered",
        shipped_at: { $lte: cutoffISO },
      }),
      // BackUpScan: delete where any pickedTrackingNumbers match collected trackingNumbers
      trackingNumbers.length
        ? TrackScan.deleteMany({
            packedTrackingNumbers: { $in: trackingNumbers },
          })
        : { deletedCount: 0 },
    ]);

    return res.status(200).json({
      message:
        "Deleted delivered orders older than 30 days across all sections.",
      cutoffISO,
      deleted: {
        Order: backUpDeleteResult.deletedCount || 0,
        VTOrder: backUpVTDeleteResult.deletedCount || 0,
        TikTokOrder: tikTokDeleteResult.deletedCount || 0,
        TrackScan: backUpScanDeleteResult.deletedCount || 0,
      },
    });
  } catch (error) {
    console.error("Error deleting delivered orders:", error);
    return res
      .status(500)
      .json({ error: "Failed to delete delivered orders." });
  }
});

router.get("/api/orders/items/:tractingId", async (req, res) => {
  const { tractingId } = req.params;
  console.log(tractingId);
  try {
    let trackingNumber = tractingId.trim();
    console.log(trackingNumber);
    if (!trackingNumber.startsWith("1Z") && !trackingNumber.startsWith("TBA")) {
      trackingNumber = trackingNumber.replace(/\D/g, "").slice(-22);
    }
    const order = await VTOrder.find({ trackingNumber });
    const items = order[0]?.items;
    res.json({ items });
  } catch (error) {
    res.json({ error });
  }
});

//get product scan status

router.get("/api/products/:trackingId", async (req, res) => {
  try {
    let { trackingId } = req.params;

    if (!trackingId) {
      return res.status(400).json({ error: "Tracking ID is required." });
    }

    trackingId = trackingId.trim();

    if (!trackingId.startsWith("1Z") && !trackingId.startsWith("TBA")) {
      trackingId = trackingId.replace(/\D/g, "").slice(-22);
    }

    const products = await TrackScan.find(
      { pickedTrackingNumbers: trackingId },
      "packedProduct"
    );

    res.json({ packedProduct: products.map((p) => p.packedProduct).flat() });
  } catch (error) {
    console.error("Error fetching packed products:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.put("/api/scan/note/:trackingId", async (req, res) => {
  let { trackingId } = req.params;
  const { packNote } = req.body;

  if (!packNote) {
    return res.status(400).json({ error: "packNote is required" });
  }

  try {
    if (!trackingId) {
      return res.status(400).json({ error: "Tracking ID is required." });
    }

    trackingId = trackingId.trim();

    if (!trackingId.startsWith("1Z") && !trackingId.startsWith("TBA")) {
      trackingId = trackingId.replace(/\D/g, "").slice(-22);
    }

    const updatedScan = await TrackScan.findOneAndUpdate(
      { packedTrackingNumbers: trackingId },
      { $set: { packNote } },
      { new: true }
    );

    if (!updatedScan) {
      return res.status(404).json({ message: "Not found Tracking ID" });
    }

    res.json({ message: "packNote updated successfully", data: updatedScan });
  } catch (error) {
    console.error("Error updating packNote:", error);
    res.status(500).json({ error: "Failed to update packNote" });
  }
});

module.exports = router;
