// tokenManager.js

const axios = require("axios");
const express = require("express");
const YardInventory = require("../../model/YardInventory");
const router = express.Router();


const baseURL = process.env.NINEYARD_BASE || "https://backyard.nineyard.com";
const email = process.env.NY_EMAIL;
const password = process.env.NY_PASSWORD;
const companyId = Number(process.env.NY_COMPANY_ID);

let cachedToken = null;
let expiresAtMs = 0;

// refresh 60s before expiry to be safe
const SKEW_MS = 60 * 1000;

async function fetchToken() {
  if (!email || !password || !companyId) {
    throw new Error("NY_EMAIL, NY_PASSWORD, NY_COMPANY_ID must be set");
  }

  const { data } = await axios.post(
    `${baseURL}/api/OAuth/UsernameToken`,
    { email, password, companyId },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );

  // Nineyard returns accessToken + expires (ISO) or expiresIn
  cachedToken = data?.accessToken;
  if (!cachedToken) throw new Error("Failed to obtain Nineyard accessToken");

  // prefer absolute "expires"; fallback to now + expiresIn (ms)
  if (data.expires) {
    expiresAtMs = new Date(data.expires).getTime();
  } else if (data.expiresIn) {
    expiresAtMs = Date.now() + Number(data.expiresIn);
  } else {
    // if not provided, assume 10 minutes
    expiresAtMs = Date.now() + 10 * 60 * 1000;
  }
  return cachedToken;
}


async function getToken({ forceRefresh = false } = {}) {
  const stillValid = cachedToken && Date.now() < (expiresAtMs - SKEW_MS);
  if (!forceRefresh && stillValid) return cachedToken;
  return await fetchToken();
}

 function clearToken() {
  cachedToken = null;
  expiresAtMs = 0;
}


const ny = axios.create({
  baseURL: process.env.NINEYARD_BASE || "https://backyard.nineyard.com",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  validateStatus: () => true, // we'll forward exact status
});

// Inject fresh token into every request
ny.interceptors.request.use(async (config) => {
  const token = await getToken();

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If 401, refresh token once and retry
ny.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config;
    if (!original || original.__retried) throw error;

    if (error.response && error.response.status === 401) {
      try {
        original.__retried = true;
        clearToken();
        const fresh = await getToken({ forceRefresh: true });
        original.headers.Authorization = `Bearer ${fresh}`;
        return ny.request(original);
      } catch (e) {
        throw error;
      }
    }
    throw error;
  }
);


// ---- Dedup memory (reason -> { items:Set<itemName>, updatedAt:number }) ----
const DEDUCT_TTL_MS = 24 * 60 * 60 * 1000; // 24h; tune as needed
const deductionMemory = new Map(); // reason => { items:Set, updatedAt:number }
const inFlightKeys = new Set();    // avoid race: (reason::itemName) currently processing

// If you want the "clear when reason changes" behavior, flip this:
// (be careful: not recommended if multiple different reasons are processed concurrently)
const CLEAR_ON_REASON_CHANGE = false;

function normalizeReason(v) {
  return String(v ?? "").trim();
}
function normalizeItemName(v) {
  return String(v ?? "").trim().toUpperCase(); // uppercase to avoid case duplicates
}
function compositeKey(reason, itemName) {
  return `${normalizeReason(reason)}::${normalizeItemName(itemName)}`;
}
function maybeCleanup() {
  const now = Date.now();
  for (const [r, bucket] of deductionMemory) {
    if (now - (bucket.updatedAt || 0) > DEDUCT_TTL_MS) {
      deductionMemory.delete(r);
    }
  }
}
function clearIfReasonChanged(currentReason) {
  if (!CLEAR_ON_REASON_CHANGE) return;
  const r = normalizeReason(currentReason);
  if (!deductionMemory.has(r) && deductionMemory.size > 0) {
    deductionMemory.clear();
  }
}
function isDuplicate(reason, itemName) {
  const r = normalizeReason(reason);
  const i = normalizeItemName(itemName);
  const bucket = deductionMemory.get(r);
  return !!(bucket && bucket.items.has(i));
}
function markDeducted(reason, itemName) {
  const r = normalizeReason(reason);
  const i = normalizeItemName(itemName);
  const bucket = deductionMemory.get(r) || { items: new Set(), updatedAt: 0 };
  bucket.items.add(i);
  bucket.updatedAt = Date.now();
  deductionMemory.set(r, bucket);
}

const WAREHOUSE_NAME = process.env.NY_WAREHOUSE_NAME || "Brecx FBM";
const LOCATION_CODE  = process.env.NY_LOCATION_CODE  || "Default Location";

async function postDecrease(req, res) {
  try {
    const { itemName, reason = "Adjustment", amountToDecrease } = req.body ?? {};
    console.log(req.body);

    if (!itemName) return res.status(400).json({ error: "itemName required" });

    const amt = Number(amountToDecrease);
    if (!Number.isInteger(amt) || amt <= 0) {
      return res
        .status(400)
        .json({ error: "amountToDecrease must be a positive integer" });
    }

    // Housekeeping
    maybeCleanup();
    clearIfReasonChanged(reason);

    const key = compositeKey(reason, itemName);

    // Block if identical (reason,itemName) was already successfully deducted
    if (isDuplicate(reason, itemName)) {
      return res.status(409).json({
        error: "already_deducted",
        message: `Inventory already deducted for '${itemName}' with reason '${reason}'.`,
      });
    }

    // Simple in-flight lock to prevent race doubles
    if (inFlightKeys.has(key)) {
      return res.status(409).json({
        error: "duplicate_in_progress",
        message: `A deduction for '${itemName}' and reason '${reason}' is already in progress.`,
      });
    }

    inFlightKeys.add(key);
    try {
      const upstream = await ny.post("/api/Items/DecreaseInventory", {
        warehouseName: WAREHOUSE_NAME,
        itemName,
        reason,
        amountToDecrease: amt,
        locationCode: LOCATION_CODE,
      });

      const body =
        (typeof upstream.data === "string" && upstream.data.trim() === "") ||
        upstream.data == null
          ? { ok: upstream.status >= 200 && upstream.status < 300 }
          : upstream.data;

      // Only mark as deducted if upstream succeeded (2xx)
      if (upstream.status >= 200 && upstream.status < 300) {
        markDeducted(reason, itemName);
      }

      return res.status(upstream.status).json(body);
    } finally {
      inFlightKeys.delete(key);
    }
  } catch (err) {
    return res.status(502).json({
      error: "Upstream error calling Nineyard",
      message: err.message,
      details: err.response?.data ?? null,
    });
  }
}


router.post("/api/items-decrease", postDecrease);




function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeItem(x = {}) {
  return {
    itemName: x.itemName ?? "",
    title: x.title ?? "",
    brand: x.brand ?? "",             // keep as-is (can be empty in API)
    qtyOnHand: Number(x.qtyOnHand ?? 0),
    imageUrl: x.imageUrl ?? "",       // API can return null; store as ""
  };
}

/** Extract an array of items from Nineyard response shapes */
function extractItems(data) {
  // Your API: { totalRecords, totalPages, itemMapping: [...] }
  if (!data) return [];
  if (Array.isArray(data.itemMapping)) return data.itemMapping;
  return [];
}

/** Fetch all Nineyard items across pages */
async function fetchAllNineyardItems(perPage = 100) {
  const all = [];

  // ---- First page to discover totalPages ----
  let page = 1;
  const first = await ny.get("/api/Items", { params: { Page: page, PerPage: perPage } });
  if (first.status < 200 || first.status >= 300) {
    const msg =
      (typeof first.data === "string" ? first.data : first.data?.message) ||
      `Nineyard /api/Items error (status ${first.status})`;
    throw new Error(msg);
  }

  const totalPages = Number(first.data?.totalPages ?? 1) || 1;
  all.push(...extractItems(first.data));

  // ---- Remaining pages ----
  for (page = 2; page <= totalPages; page += 1) {
    const { status, data } = await ny.get("/api/Items", {
      params: { Page: page, PerPage: perPage },
    });

    if (status < 200 || status >= 300) {
      const msg =
        (typeof data === "string" ? data : data?.message) ||
        `Nineyard /api/Items error (status ${status})`;
      throw new Error(msg);
    }
    all.push(...extractItems(data));
  }

  return all;
}

async function postStoreFromYard(req, res) {
  try {
    const perPage = Number(req.query.perPage || 100);
    const snapshotDate = todayUTC();

    // 1) Fetch all Nineyard items
    const rawItems = await fetchAllNineyardItems(perPage);

    // 2) Keep only requested fields and ensure itemName exists
    const cleaned = rawItems
      .map(normalizeItem)
      .filter((r) => r.itemName && String(r.itemName).trim().length > 0);

    // 3) Upsert daily, de-duplicated by (itemName + snapshotDate)
    const ops = cleaned.map((doc) => ({
      updateOne: {
        filter: { itemName: doc.itemName, snapshotDate },
        update: {
          $set: {
            snapshotDate,
            itemName: doc.itemName,
            title: doc.title,
            brand: doc.brand,
            qtyOnHand: doc.qtyOnHand,
            imageUrl: doc.imageUrl,
          },
        },
        upsert: true,
      },
    }));

    const result = ops.length
      ? await YardInventory.bulkWrite(ops, { ordered: false })
      : { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };

    // 4) Respond with stats
    return res.json({
      ok: true,
      snapshotDate,
      fetched: rawItems.length,
      kept: cleaned.length,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      matched: result.matchedCount || 0,
    });
  } catch (err) {
    return res.status(502).json({
      error: "Failed to store Yard inventory",
      message: err.message,
      details: err.response?.data ?? null,
    });
  }
}

router.post("/api/store-from-yard", postStoreFromYard);


router.get("/api/yard-intentory", async (req, res) => {
  try {
    const {
      q,
      itemName,
      title,
      date,
      hasStock,
      minOnHand,
      maxOnHand,
      page = 1,
      limit = 100,
      sort = "-qtyOnHand",
    } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const snapshotDate = (date && String(date)) || todayUTC();

    const norm = (s) => String(s || "").trim();
    const toRegex = (s) =>
      s ? new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;

    const filter = { snapshotDate };

    // search: q hits itemName OR title
    const qv = norm(q);
    if (qv) {
      const rx = toRegex(qv);
      filter.$or = [{ itemName: rx }, { title: rx }];
    }

    // narrower field searches
    const nm = norm(itemName);
    if (nm) {
      filter.itemName = toRegex(nm);
    }
    const ti = norm(title);
    if (ti) {
      filter.title = toRegex(ti);
    }

    // on-hand stock filters
    const minV = Number(minOnHand);
    if (!Number.isNaN(minV)) {
      filter.qtyOnHand = { ...(filter.qtyOnHand || {}), $gte: minV };
    }
    const maxV = Number(maxOnHand);
    if (!Number.isNaN(maxV)) {
      filter.qtyOnHand = { ...(filter.qtyOnHand || {}), $lte: maxV };
    }
    if (hasStock === "true") {
      filter.qtyOnHand = { ...(filter.qtyOnHand || {}), $gt: 0 };
    } else if (hasStock === "false") {
      // explicitly zero stock
      filter.qtyOnHand = { ...(filter.qtyOnHand || {}), $eq: 0 };
    }

    // sort parsing
    const sortObj = (() => {
      const s = String(sort || "").trim();
      if (!s) return { qtyOnHand: -1 };
      if (s.startsWith("-")) return { [s.slice(1)]: -1 };
      return { [s]: 1 };
    })();

    // projection: return only the five fields you care about (+ _id for uniqueness if needed)
    const projection = {
      _id: 0,
      itemName: 1,
      title: 1,
      brand: 1,
      qtyOnHand: 1,
      imageUrl: 1,
    };

    const [total, rows] = await Promise.all([
      YardInventory.countDocuments(filter),
      YardInventory.find(filter, projection)
        .sort(sortObj)
        .skip((p - 1) * l)
        .limit(l),
    ]);

    res.json({
      ok: true,
      snapshotDate,
      page: p,
      limit: l,
      total,
      sort: sortObj,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch Yard inventory",
      message: err.message,
    });
  }
});

router.get("/api/yard-intentory/:itemName", async (req, res) => {
  try {
    const { itemName } = req.params;
    const { date } = req.query; // optional: specify snapshotDate
    const snapshotDate = (date && String(date)) || new Date().toISOString().slice(0, 10);

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: "itemName is required" });
    }

    const doc = await YardInventory.findOne(
      { itemName: itemName.trim(), snapshotDate },
      { _id: 0, qtyOnHand: 1 } // only return qtyOnHand
    );

    if (!doc) {
      return res.status(404).json({
        ok: false,
        message: `No record found for itemName '${itemName}' on ${snapshotDate}`,
      });
    }

    res.json({
      qtyOnHand: doc.qtyOnHand,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch Yard inventory qty",
      message: err.message,
    });
  }
});

router.get("/api/yard-inventory/:itemName/item",async(req,res)=>{

   try {
    const {itemName} = req.params;


    const amt = 3;
    const current = await YardInventory.findOne(
      {itemName: itemName.trim()},
      {_id:0,qtyOnHand:1}
    )

    if(current){
      const onHand = Number(current.qtyOnHand || 0);
     if(onHand<=0){
       return res.json({
        ok:false,
        error:"OutOfStock",
        message:`Item ${itemName} is out of stock now!`,
      })

     }

     if(amt>onHand){
      return res.status(400).json({
        ok:false,
        error:"InsufficientStock",
        message:`Requested decrease (${amt}) exceeds stock(${onHand}) now.`
      })
     }

    }

    res.json({
      message:"deducted"
    })

   } catch (error) {
    console.log(error);
   }


})


module.exports = router;

