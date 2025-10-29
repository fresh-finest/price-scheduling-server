const express = require("express");
const axios = require("axios");
const FaireOrder = require("../../model/FaireOrder");
const VTOrder = require("../../model/VTOrder");

const router = express.Router();

const app = express();

const FAIRE_APP_ID = process.env.FAIRE_APP_ID;
const FAIRE_APP_SECRET = process.env.FAIRE_APP_SECRET;
const FAIRE_REDIRECT_URL = process.env.FAIRE_REDIRECT_URL;

const FAIR_BASE = "https://www.faire.com/external-api/v2/orders";
const DEFAULT_LIMIT = 50;
const MAX_PAGES_DEFAULT = 2; // safety cap for all=true
const REQUEST_TIMEOUT_MS = 20000;

// Basic exponential backoff for 429/5xx
async function axiosWithRetry(config, { retries = 3, baseDelayMs = 500 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios({ timeout: REQUEST_TIMEOUT_MS, ...config });
    } catch (err) {
      const status = err?.response?.status;
      const shouldRetry = status === 429 || (status >= 500 && status < 600);
      if (!shouldRetry || attempt === retries) throw err;

      const retryAfterHeader = err?.response?.headers?.["retry-after"];
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : null;
      const delayMs = retryAfterMs ?? baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function mapState(state) {
  switch (String(state || "").toUpperCase()) {
    case "PRE_TRANSIT":
      return "awaiting_collection";
    case "IN_TRANSIT":
      return "in_transit";
    case "DELIVERED":
      return "delivered";
    case "CANCELED":
      return "canceled";
    case "PENDING_RETAILER_CONFIRMATION":
      return "contact_support";
    case "DAMAGED_OR_MISSING":
      return "contact_support";
    default:
      return (state || "").toLowerCase(); // fallback (keeps unknowns visible)
  }
}

function buildAddress(addr = {}) {
  const parts = [
    addr.company,
    [addr.first_name, addr.last_name].filter(Boolean).join(" ") || addr.name,
    addr.address1,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());
  return parts.join(", ");
}

// Convert one Faire order to your schema shape
function mapFaireOrder(order) {
  const shipments = Array.isArray(order?.shipments) ? order.shipments : [];
  const firstShipment = shipments[0] || {};

  // Tracking numbers (unique, non-empty)
  const tracking = [
    ...new Set(
      shipments
        .map((s) => s?.tracking_code)
        .filter(Boolean)
        .map(String)
    ),
  ];

  // Items
  const items = (Array.isArray(order?.items) ? order.items : []).map((it) => ({
    sku: it?.sku || it?.variant_sku || "",
    quantity: Number(it?.quantity || 0),
    title: it?.product_name || it?.name || "",
    image: it?.image_url || "",
  }));

  // Customer + address (shipping preferred)
  const shipTo =
    order?.ship_to || order?.address || order?.shipping_address || {};
  const customerName =
    shipTo?.name ||
    [shipTo?.first_name, shipTo?.last_name].filter(Boolean).join(" ") ||
    order?.retailer?.name ||
    "";

  return {
    OrderId: order?.display_id ? String(order.display_id) : "", // unique key
    id: order?.id ? String(order.id) : "",
    shipped_at: firstShipment?.created_at || "", // shipments[created_at]
    created_at: firstShipment?.created_at || order?.created_at || "", // per your mapping, fallback to order.created_at
    carrier_name: firstShipment?.carrier || firstShipment?.carrier_name || "",
    customerName,
    address: buildAddress(shipTo),
    trackingNumber: tracking,
    channelCode: "faire",
    channelName: "faire",
    items,
    status: mapState(order?.state),
  };
}

function hasShipments(order) {
  const arr = Array.isArray(order?.shipments) ? order.shipments : [];
  return arr.length > 0;
}

// (unchanged) mapFaireOrder, axiosWithRetry, mapState, buildAddress ...

// Save many, skipping existing records by OrderId
async function saveFaireOrdersUnique(rawOrders = []) {
  // 1) Keep only orders that have at least one shipment
  const ordersWithShipments = rawOrders.filter(hasShipments);

  // 2) Convert to our schema shape
  const docs = ordersWithShipments.map(mapFaireOrder).filter((d) => d.OrderId); // must have unique key

  if (!docs.length)
    return { upserted: 0, skippedExisting: 0, filteredOut: rawOrders.length };

  // 3) Deduplicate within this batch by OrderId
  const seen = new Set();
  const uniqueDocs = [];
  for (const d of docs) {
    if (!seen.has(d.OrderId)) {
      seen.add(d.OrderId);
      uniqueDocs.push(d);
    }
  }

  // 4) Upsert using $setOnInsert so existing OrderId are skipped
  const ops = uniqueDocs.map((d) => ({
    updateOne: {
      filter: { OrderId: d.OrderId },
      update: { $setOnInsert: d },
      upsert: true,
    },
  }));

  const result = await FaireOrder.bulkWrite(ops, { ordered: false });
  const upserted = result?.upsertedCount || 0;
  const matched = result?.matchedCount || 0; // existing docs (i.e., skipped)
  const filteredOut = rawOrders.length - ordersWithShipments.length;

  return { upserted, skippedExisting: matched, filteredOut };
}

router.get("/api/get-faire-orders", async (req, res) => {
  try {
    const token = process.env.FAIRE_ACCESS_TOKEN;
    if (!token)
      return res.status(500).json({ error: "FAIRE_ACCESS_TOKEN not set" });

    const {
      cursor,
      limit,
      all,
      maxPages,
      updated_at_min,
      created_at_max,
      exclude_statuses,
      save, // if "true" → save to DB
    } = req.query;
  
    const pageLimit = Number(limit) > 0 ? Number(limit) : 50;
    const pagesCap = Number(maxPages) > 0 ? Number(maxPages) : 25;
    const headers = { "X-FAIRE-ACCESS-TOKEN": token };
    
    const baseParams = {};
    if (pageLimit) baseParams.limit = pageLimit;
    if (cursor) baseParams.cursor = cursor;
  
    const now = new Date();
      now.setUTCDate(now.getUTCDate() - 3);
 
    const created_at_min= now.toISOString();
    // const created_at_min='2025-10-25T00:00:00.000Z'
    if (created_at_min) baseParams.created_at_min = created_at_min;
    if (created_at_max) baseParams.created_at_max = created_at_max;
    if (exclude_statuses) baseParams.exclude_statuses = exclude_statuses;

    const fetchOnePage = async (params) => {
      const resp = await axiosWithRetry({
        method: "GET",
        url: FAIR_BASE,
        headers,
        params,
      });
      return resp.data;
    };

    const doSave = String(save).toLowerCase() === "true";

    if (String(all).toLowerCase() === "true") {
      let nextParams = { ...baseParams };
      let allOrders = [];
      let nextCursor = null;
      let pages = 0;

      do {
        const pageData = await fetchOnePage(nextParams);
        const orders = Array.isArray(pageData?.orders) ? pageData.orders : [];
        allOrders = allOrders.concat(orders);
        nextCursor = pageData?.cursor || null;
        pages += 1;
        if (!nextCursor || pages >= pagesCap) break;
        nextParams = { limit: pageLimit, cursor: nextCursor };
      } while (true);

      if (doSave) {
        await saveFaireOrdersUnique(allOrders);
        return res.json({ message: "Successfully inserted!" });
      }

      return res.json({
        count: allOrders.length,
        pagesFetched: pages,
        nextCursor,
        orders: allOrders.filter(hasShipments), // optional: only return shipped if you prefer
      });
    }

    // Single page
    const data = await fetchOnePage(baseParams);
    const orders = Array.isArray(data?.orders) ? data.orders : [];

    if (doSave) {
      await saveFaireOrdersUnique(orders);
      return res.json({ message: "Successfully inserted!" });
    }

    return res.json({
      page: data?.page ?? 1,
      limit: data?.limit ?? pageLimit,
      cursor: data?.cursor ?? null,
      orders: orders.filter(hasShipments), // optional: only return shipped if you prefer
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const msg = err?.response?.data || err?.message || "Unknown error";
    return res.status(status).json({ error: msg });
  }
});

router.get("/api/get-faire-orders", async (req, res) => {
  try {
    const token = process.env.FAIRE_ACCESS_TOKEN;
    if (!token)
      return res.status(500).json({ error: "FAIRE_ACCESS_TOKEN not set" });

    const {
      cursor,
      limit,
      all,
      maxPages,
      updated_at_min,
      created_at_min,
      created_at_max,
      exclude_statuses,
      save, // <<—— NEW: if "true", save to DB with unique OrderId
    } = req.query;

    const pageLimit = Number(limit) > 0 ? Number(limit) : 50;
    const pagesCap = Number(maxPages) > 0 ? Number(maxPages) : 25;

    const headers = { "X-FAIRE-ACCESS-TOKEN": token };

    const baseParams = {};
    if (pageLimit) baseParams.limit = pageLimit;
    if (cursor) baseParams.cursor = cursor;
    if (updated_at_min) baseParams.updated_at_min = updated_at_min;
    if (created_at_min) baseParams.created_at_min = created_at_min;
    if (created_at_max) baseParams.created_at_max = created_at_max;
    if (exclude_statuses) baseParams.exclude_statuses = exclude_statuses;

    const fetchOnePage = async (params) => {
      const resp = await axiosWithRetry({
        method: "GET",
        url: FAIR_BASE,
        headers,
        params,
      });
      return resp.data;
    };

    let payload;
    if (String(all).toLowerCase() === "true") {
      let nextParams = { ...baseParams };
      let allOrders = [];
      let nextCursor = null;
      let pages = 0;

      do {
        const pageData = await fetchOnePage(nextParams);
        const orders = Array.isArray(pageData?.orders) ? pageData.orders : [];
        allOrders = allOrders.concat(orders);
        nextCursor = pageData?.cursor || null;

        pages += 1;
        if (!nextCursor || pages >= pagesCap) break;

        nextParams = { limit: pageLimit, cursor: nextCursor };
      } while (true);

      payload = {
        count: allOrders.length,
        pagesFetched: pages,
        nextCursor,
        orders: allOrders,
      };

      if (String(save).toLowerCase() === "true") {
        const { upserted, skippedExisting } = await saveFaireOrdersUnique(
          allOrders
        );
        payload.saved = {
          upserted,
          skippedExisting,
          totalProcessed: allOrders.length,
        };
      }

      return res.json(payload);
    }

    // Single page
    const data = await fetchOnePage(baseParams);
    payload = {
      page: data?.page ?? 1,
      limit: data?.limit ?? pageLimit,
      cursor: data?.cursor ?? null,
      orders: data?.orders ?? [],
    };

    if (String(save).toLowerCase() === "true") {
      const { upserted, skippedExisting } = await saveFaireOrdersUnique(
        payload.orders
      );
      payload.saved = {
        upserted,
        skippedExisting,
        totalProcessed: (payload.orders || []).length,
      };
    }

    return res.json({ message: "Successfully inserted!" });
  } catch (err) {
    const status = err?.response?.status || 500;
    const msg = err?.response?.data || err?.message || "Unknown error";
    return res.status(status).json({ error: msg });
  }
});

// Map Faire "state" to our "status"
function mapFaireStateToStatus(state) {
  switch (state) {
    case "PRE_TRANSIT":
      return "awaiting_collection";
    case "IN_TRANSIT":
      return "in_transit";
    case "DELIVERED":
      return "delivered";
    case "CANCELED":
      return "canceled";
    case "PENDING_RETAILER_CONFIRMATION":
    case "DAMAGED_OR_MISSING":
      return "contact_support";
    default:
      return "contact_support";
  }
}

// POST /api/faire-order/update
router.post("/api/faire-order/update", async (req, res) => {
  const FAIRE_TOKEN = process.env.FAIRE_ACCESS_TOKEN;

  try {
    if (!FAIRE_TOKEN) {
      return res.status(500).json({ error: "FAIRE_API_TOKEN is not set" });
    }

    // Only orders not already delivered
    const candidates = await FaireOrder.find(
      { status: { $ne: "delivered" } },
      { id: 1, status: 1 }
    ).lean();

    if (!candidates.length) {
      return res.json({
        checked: 0,
        updated: 0,
        results: [],
        message: "No orders to update.",
      });
    }

    const headers = { "X-FAIRE-ACCESS-TOKEN": FAIRE_TOKEN };
    let checked = 0;
    let updated = 0;
    const results = [];

    // Sequential processing (no p-limit)
    for (const doc of candidates) {
      checked += 1;
      if (!doc.id) {
        results.push({ id: null, action: "skip", reason: "missing faire id" });
        continue;
      }

      try {
        const { data } = await axios.get(`${FAIR_BASE}/${doc.id}`, {
          headers,
          timeout: 15000,
        });

        const faireState = data?.state;

        if (!faireState) {
          results.push({
            id: doc.id,
            action: "skip",
            reason: "no state in response",
          });
          continue;
        }

        const mappedStatus = mapFaireStateToStatus(faireState);

        if (mappedStatus !== doc.status) {
          await FaireOrder.updateOne(
            { id: doc.id },
            { $set: { status: mappedStatus } }
          );
          updated += 1;
          results.push({
            id: doc.id,
            action: "update",
            from: doc.status || null,
            to: mappedStatus,
          });
        } else {
          results.push({ id: doc.id, action: "noop", status: mappedStatus });
        }
      } catch (err) {
        results.push({
          id: doc.id,
          action: "error",
          reason: err.response?.data || err.message,
        });
      }
    }

    return res.json({ checked, updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
});

router.get("/api/faire-orders", async (req, res) => {
  try {
    const result = await FaireOrder.find({});
    res.json({ total: result.length, result });
  } catch (error) {
    console.log(error);
    res.json({ error });
  }
});

const sanitizeString = (value) => {
  if (typeof value !== "string") return "";
  // Remove invalid surrogate pairs and non-UTF-8 characters
  return value
    .normalize("NFKD") // normalize to decompose characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // control chars
    .replace(/[\uD800-\uDFFF]/g, "") // remove surrogate pairs
    .replace(/[^\x00-\x7F]/g, ""); // remove non-ASCII (you may omit this if Unicode is OK)
};


router.get('/api/faire-merge', async (req, res) => {
  try {
    console.log('merging (faire ➜ VTOrder)');

    // Pull all Faire orders (you already store only ones with shipments)
    const faireOrders = await FaireOrder.find().sort({ shipped_at: -1, created_at: -1 });

    let mergedCount = 0;

    for (const order of faireOrders) {
      const merged = {
        OrderId: order.OrderId,
        id: order.id || order.OrderId,

        // timestamps / shipping
        shipped_at: order.shipped_at || '',
        created_at: order.created_at || '',

        // carrier / tracking
        carrier_name: order.carrier_name || '',
        trackingNumber: Array.isArray(order.trackingNumber) ? order.trackingNumber : [],
        trackingUrl: order.trackingUrl || '',       // may be empty on Faire
        shipmentId: order.shipmentId || '',         // may be empty on Faire

        // customer / address
        customerName: sanitizeString(order.customerName || ''),
        address: sanitizeString(order.address || ''),

        // meta
        tags: Array.isArray(order.tags) ? order.tags : [],
        channelCode: order.channelCode || 'faire',
        channelName: order.channelName || 'faire',

        // items
        items: Array.isArray(order.items) ? order.items : [],

        // status (already mapped when saved from Faire)
        status: order.status || '',
      };

      // Always update (upsert) into VTOrder
      await VTOrder.findOneAndUpdate(
        { OrderId: merged.OrderId },
        { $set: merged },
        { upsert: true, new: true }
      );

      mergedCount++;
    }

    return res.json({
      message: `Merged ${mergedCount} Faire orders into VTOrder collection`,
    });
  } catch (error) {
    console.error('❌ Faire merge error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to merge Faire orders' });
  }
});
module.exports = router;
