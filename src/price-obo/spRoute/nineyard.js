// tokenManager.js

const axios = require("axios");
const express = require("express");
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


const WAREHOUSE_NAME = process.env.NY_WAREHOUSE_NAME || "Brecx FBM";
const LOCATION_CODE  = process.env.NY_LOCATION_CODE  || "Default Location";

async function postDecrease(req, res) {
  try {
    const { itemName, reason = "Adjustment", amountToDecrease } = req.body ?? {};

    if (!itemName) return res.status(400).json({ error: "itemName required" });
    const amt = Number(amountToDecrease);
    if (!Number.isInteger(amt) || amt <= 0) {
      return res.status(400).json({ error: "amountToDecrease must be a positive integer" });
    }

    const upstream = await ny.post("/api/Items/DecreaseInventory", {
      warehouseName: WAREHOUSE_NAME,
      itemName,
      reason,
      amountToDecrease: amt,
      locationCode: LOCATION_CODE,
    });

    const body =
      (typeof upstream.data === "string" && upstream.data.trim() === "") || upstream.data == null
        ? { ok: upstream.status >= 200 && upstream.status < 300 }
        : upstream.data;

    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({
      error: "Upstream error calling Nineyard",
      message: err.message,
      details: err.response?.data ?? null,
    });
  }
}

router.post("/api/items-decrease", postDecrease);

module.exports = router;

