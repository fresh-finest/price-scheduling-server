const express = require("express");
const axios = require("axios");
const Product = require("../../model/Product");
const BuyBox = require("../../model/BuyBox");
const router = express.Router();

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const FRESH_SELLER_ID = "A1N3Q1O4EX6DD8";

const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID || "ATVPDKIKX0DER",
};

const fetchAccessToken = async () => {
  try {
    const { data } = await axios.post("https://api.amazon.com/auth/o2/token", {
      grant_type: "refresh_token",
      refresh_token: credentials.refresh_token,
      client_id: credentials.lwa_app_id,
      client_secret: credentials.lwa_client_secret,
    });
    return data.access_token;
  } catch (err) {
    console.error(
      "Error fetching access token:",
      err.response ? err.response.data : err.message
    );
    throw err;
  }
};

const getItemOffers = async ({
  asin,
  marketplaceId,
  itemCondition = "New",
  customerType = "Consumer", // Consumer | Business
}) => {
  const accessToken = await fetchAccessToken();

  const url =
    `https://sellingpartnerapi-na.amazon.com/products/pricing/v0/items/${encodeURIComponent(
      asin
    )}/offers` +
    `?MarketplaceId=${encodeURIComponent(marketplaceId)}` +
    `&ItemCondition=${encodeURIComponent(itemCondition)}` +
    `&CustomerType=${encodeURIComponent(customerType)}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "x-amz-access-token": accessToken,
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    const rateLimit = response.headers?.["x-amzn-ratelimit-limit"];
    const requestId = response.headers?.["x-amzn-requestid"];

    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        status: response.status,
        requestId,
        rateLimit,
        data: response.data,
      };
    }

    return {
      ok: true,
      status: response.status,
      requestId,
      rateLimit,
      data: response.data,
    };
  } catch (err) {
    console.error(
      "Error fetching item offers:",
      err.response ? err.response.data : err.message
    );
    throw err;
  }
};

const priceToString = (n) =>
  n === undefined || n === null || isNaN(Number(n))
    ? ""
    : String(Number(n).toFixed(2));

const getOffersPayload = (data) =>
  data?.payload || data?.offers?.payload || null;

function pickBestOfferPerSeller(offers = []) {
  const bySeller = new Map();
  for (const o of offers) {
    const key = o.SellerId;
    const listing = Number(o?.ListingPrice?.Amount ?? Infinity);
    const isBB = !!o?.IsBuyBoxWinner;

    const current = bySeller.get(key);
    if (!current) {
      bySeller.set(key, { offer: o, listing, isBB });
      continue;
    }
    if (
      (!current.isBB && isBB) ||
      (!current.isBB && !isBB && listing < current.listing)
    ) {
      bySeller.set(key, { offer: o, listing, isBB });
    }
  }
  return Array.from(bySeller.values()).map((x) => x.offer);
}

const toSellerDoc = (o) => ({
  seller_id: o?.SellerId || "",
  IsBuyBox: !!o?.IsBuyBoxWinner,
  listingPrice: priceToString(o?.ListingPrice?.Amount),
  IsFulfilledByAmazon: !!o?.IsFulfilledByAmazon
});

const storeInBuyBox = async (listings = []) => {
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];

    const asin = listing?.asin1;
    const sku = listing?.sellerSku;
    const title = listing?.itemName || "";
    const image = listing?.imageUrl || "";

    if (!asin) {
      skipped++;
      console.warn(`Skipping #${i}: missing ASIN for SKU ${sku || "(no sku)"}`);
      continue;
    }

    await delay(1000);

    try {
      const result = await getItemOffers({
        asin,
        marketplaceId: credentials.marketplace_id,
        itemCondition: "New",
        customerType: "Consumer",
      });

      if (!result.ok) {
        failed++;
        console.warn(
          `SP-API error for ASIN ${asin} (status ${result.status}):`,
          JSON.stringify(result.data)
        );
        continue;
      }

      const payload = getOffersPayload(result.data);
      if (!payload) {
        failed++;
        console.warn(`No payload for ASIN ${asin}`);
        continue;
      }

      const landedPrice = priceToString(
        payload?.Summary?.BuyBoxPrices?.[0]?.LandedPrice?.Amount
      );
      const competitivePrice = priceToString(
        payload?.Summary?.CompetitivePriceThreshold?.Amount
      );

      const allOffers = Array.isArray(payload?.Offers) ? payload.Offers : [];

      const freshOffers = allOffers.filter(
        (o) => o?.SellerId === FRESH_SELLER_ID
      );
      const otherOffersRaw = allOffers.filter(
        (o) => o?.SellerId && o.SellerId !== FRESH_SELLER_ID
      );

      const bestOthers = pickBestOfferPerSeller(otherOffersRaw);

      const fresFinest = freshOffers.map(toSellerDoc);
      const otherSeller = bestOthers.map(toSellerDoc);

      await BuyBox.replaceOne(
        { asin },
        {
          asin,
          sku,
          title,
          image,
          landedPrice,
          competitivePrice,
          fresFinest,
          otherSeller,
        },
        { upsert: true }
      );

      success++;
      console.log(
        `[${i + 1}/${
          listings.length
        }] Upserted BuyBox for ASIN ${asin} (fresh: ${
          fresFinest.length
        }, others: ${otherSeller.length})`
      );
    } catch (err) {
      failed++;
      console.error(
        `[${i + 1}/${listings.length}] Error for ASIN ${asin}:`,
        err?.message || err
      );
    }
  }

  return { success, skipped, failed, total: listings.length };
};

router.get("/store-in-buybox", async (req, res) => {
  try {
    const listings = await Product.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    const summary = await storeInBuyBox(listings);

    res.json({
      ok: true,
      message: "BuyBox data processed.",
      summary,
    });
  } catch (error) {
    console.error("Error during data processing:", error);
    res
      .status(500)
      .json({ ok: false, error: "Failed to fetch, merge, and save data" });
  }
});

/* router.get("/api/buy-box", async (req, res) => {
  try {
    // -------- Query params --------
    const q = (req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page ?? "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit ?? "50", 10) || 50;
    const limit = Math.max(1, Math.min(limitRaw, 200));
    const skip = (page - 1) * limit;

    const sellerParam = (req.query.seller || "all").toLowerCase();
    const sellerFilter =
      sellerParam === "fresh" ? "fresh" :
      sellerParam === "others" ? "others" : "all";

    const bbParam = (req.query.buybox || "all").toLowerCase();
    const bbFilter =
      bbParam === "true" ? true :
      bbParam === "false" ? false : null; // null => no filter

    // -------- $match (search + existence) --------
    const match = {};
    if (q) {
      match.$or = [
        { sku:   { $regex: q, $options: "i" } },
        { asin:  { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } },
      ];
    }
    if (sellerFilter === "fresh") {
      match["fresFinest.0"] = { $exists: true };
    } else if (sellerFilter === "others") {
      match["otherSeller.0"] = { $exists: true };
    }

    // -------- Pipeline --------
    const pipeline = [];

    // 1) Search / existence
    pipeline.push({ $match: match });

    // 2) Build view arrays based on buybox filter (keep originals intact)
    const bbCondExpr = bbFilter === null ? null : { $eq: ["$$s.IsBuyBox", bbFilter] };
    pipeline.push({
      $addFields: {
        // originals stay (no change)
        fresFinest: { $ifNull: ["$fresFinest", []] },
        otherSeller: { $ifNull: ["$otherSeller", []] },

        // view arrays (respect buybox)
        fresFinest_view: bbFilter === null
          ? { $ifNull: ["$fresFinest", []] }
          : {
              $filter: {
                input: { $ifNull: ["$fresFinest", []] },
                as: "s",
                cond: bbCondExpr,
              },
            },
        otherSeller_view: bbFilter === null
          ? { $ifNull: ["$otherSeller", []] }
          : {
              $filter: {
                input: { $ifNull: ["$otherSeller", []] },
                as: "s",
                cond: bbCondExpr,
              },
            },
      },
    });

    // 3) Counts from the *view* arrays (post-buybox)
    pipeline.push({
      $addFields: {
        fresCount:   { $size: { $ifNull: ["$fresFinest_view", []] } },
        othersCount: { $size: { $ifNull: ["$otherSeller_view", []] } },
      },
    });

    // 4) If seller=..., keep only docs with data on that side (using view counts)
    if (sellerFilter === "fresh") {
      pipeline.push({ $match: { fresCount: { $gt: 0 } } });
    } else if (sellerFilter === "others") {
      pipeline.push({ $match: { othersCount: { $gt: 0 } } });
    }

    // 5) Project everything you need (keep originals + views)
    pipeline.push({
      $project: {
        asin: 1,
        sku: 1,
        title: 1,
        image: 1,
        landedPrice: 1,
        competitivePrice: 1,
        updatedAt: 1,
        createdAt: 1,

        // counts (from views)
        fresCount: 1,
        othersCount: 1,

        // originals (unmodified)
        fresFinest: 1,
        otherSeller: 1,

        // view arrays (filtered by buybox)
        fresFinest_view: 1,
        otherSeller_view: 1,

        // helper for UI if you want
        activeSellerSide: { $literal: sellerFilter },
        buyboxFilter: { $literal: (bbFilter === null ? "all" : bbFilter) },
      },
    });

    // 6) Sort + paginate + total
    pipeline.push({ $sort: { updatedAt: -1, _id: -1 } });
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    });

    // 7) Execute
    const [agg] = await BuyBox.aggregate(pipeline);
    const total = agg?.total?.[0]?.count || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      ok: true,
      page,
      limit,
      total,
      pages,
      seller: sellerFilter,
      buybox: bbFilter,
      q,
      result: agg?.data ?? [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}); */

// GET /api/buy-box
// GET /api/buy-box
router.get("/api/buy-box", async (req, res) => {
  try {
    // -------- Query params --------
    const q = (req.query.q || "").trim();

    const page = Math.max(parseInt(req.query.page ?? "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit ?? "50", 10) || 50;
    const limit = Math.max(1, Math.min(limitRaw, 200));
    const skip = (page - 1) * limit;

    // seller: fresh | others | all
    const sellerParam = (req.query.seller || "all").toLowerCase();
    const sellerFilter =
      sellerParam === "fresh"
        ? "fresh"
        : sellerParam === "others"
        ? "others"
        : "all";

    // buybox: true | false | all
    const bbParam = (req.query.buybox || "all").toLowerCase();
    const bbFilter =
      bbParam === "true" ? true : bbParam === "false" ? false : null; // null => no filter

    // channel: all | true | false | fba | fbm
    const channelParam = (req.query.channel || "all").toLowerCase();
    const channelFilter =
      channelParam === "true" || channelParam === "fba"
        ? true
        : channelParam === "false" || channelParam === "fbm"
        ? false
        : null; // null => no filter

    // price sorting / filtering
    const priceSort = (req.query.priceSort || "").toLowerCase(); // asc | desc
    const priceOp = (req.query.priceOp || "").toLowerCase(); // eq|gt|gte|lt|lte|between
    const price = req.query.price != null ? Number(req.query.price) : null;
    const priceMin =
      req.query.priceMin != null ? Number(req.query.priceMin) : null;
    const priceMax =
      req.query.priceMax != null ? Number(req.query.priceMax) : null;

    // -------- Pipeline --------
    const pipeline = [];

    // 1) Initial text search match
    const match = {};
    if (q) {
      match.$or = [
        { sku: { $regex: q, $options: "i" } },
        { asin: { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } },
      ];
    }
    pipeline.push({ $match: match });

    // 2) landedPrice -> landedPriceNum (safe string → number)
    pipeline.push({
      $addFields: {
        landedPriceNum: {
          $convert: {
            input: {
              $replaceAll: {
                input: {
                  $replaceAll: {
                    input: {
                      $trim: {
                        input: { $ifNull: ["$landedPrice", ""] },
                      },
                    },
                    find: ",",
                    replacement: "",
                  },
                },
                // IMPORTANT: wrap "$" with $literal
                find: { $literal: "$" },
                replacement: "",
              },
            },
            to: "double",
            onError: null,
            onNull: null,
          },
        },
      },
    });

    // 3) Build array-filter condition (buybox + channel) — only if needed
    const hasBB = bbFilter !== null;
    const hasChannel = channelFilter !== null;
    const hasConds = hasBB || hasChannel;

    const combinedCond = !hasConds
      ? null
      : {
          $and: [
            ...(hasBB ? [{ $eq: ["$$s.IsBuyBox", bbFilter] }] : []),
            ...(hasChannel
              ? [
                  {
                    $eq: [
                      { $ifNull: ["$$s.IsFulfilledByAmazon", false] },
                      channelFilter,
                    ],
                  },
                ]
              : []),
          ],
        };

    // 4) Keep originals + create *_view arrays (filtered if needed)
    pipeline.push({
      $addFields: {
        fresFinest: { $ifNull: ["$fresFinest", []] },
        otherSeller: { $ifNull: ["$otherSeller", []] },

        fresFinest_view: !hasConds
          ? { $ifNull: ["$fresFinest", []] }
          : {
              $filter: {
                input: { $ifNull: ["$fresFinest", []] },
                as: "s",
                cond: combinedCond,
              },
            },

        otherSeller_view: !hasConds
          ? { $ifNull: ["$otherSeller", []] }
          : {
              $filter: {
                input: { $ifNull: ["$otherSeller", []] },
                as: "s",
                cond: combinedCond,
              },
            },
      },
    });

    // 5) Counts from view arrays
    pipeline.push({
      $addFields: {
        fresCount: { $size: { $ifNull: ["$fresFinest_view", []] } },
        othersCount: { $size: { $ifNull: ["$otherSeller_view", []] } },
      },
    });

    // 6) Seller-side inclusion based on view counts
    if (sellerFilter === "fresh") {
      pipeline.push({ $match: { fresCount: { $gt: 0 } } });
    } else if (sellerFilter === "others") {
      pipeline.push({ $match: { othersCount: { $gt: 0 } } });
    } else {
      // seller=all → if filters applied, require at least one side to match
      if (hasConds) {
        pipeline.push({
          $match: {
            $or: [{ fresCount: { $gt: 0 } }, { othersCount: { $gt: 0 } }],
          },
        });
      }
    }

    // 7) Landed price filter (document-level)
    if (priceOp) {
      if (priceOp === "between") {
        const and = [];
        if (Number.isFinite(priceMin))
          and.push({ landedPriceNum: { $gte: priceMin } });
        if (Number.isFinite(priceMax))
          and.push({ landedPriceNum: { $lte: priceMax } });
        if (and.length) pipeline.push({ $match: { $and: and } });
      } else if (
        ["eq", "gt", "gte", "lt", "lte"].includes(priceOp) &&
        Number.isFinite(price)
      ) {
        pipeline.push({
          $match: { landedPriceNum: { [`$${priceOp}`]: price } },
        });
      }
    }

    // 8) Projection (keep originals + views + counts + helpers)
    pipeline.push({
      $project: {
        asin: 1,
        sku: 1,
        title: 1,
        image: 1,
        landedPrice: 1,
        landedPriceNum: 1,
        competitivePrice: 1,
        updatedAt: 1,
        createdAt: 1,

        fresCount: 1,
        othersCount: 1,

        // originals
        fresFinest: 1,
        otherSeller: 1,

        // filtered views
        fresFinest_view: 1,
        otherSeller_view: 1,

        // helpers
        activeSellerSide: { $literal: sellerFilter },
        buyboxFilter: { $literal: bbFilter === null ? "all" : bbFilter },
        channelFilter: {
          $literal: channelFilter === null ? "all" : channelFilter,
        },
      },
    });

    // 9) Sorting
    const sortStage = {};
    if (priceSort === "asc") {
      sortStage.landedPriceNum = 1;
      sortStage._id = -1;
    } else if (priceSort === "desc") {
      sortStage.landedPriceNum = -1;
      sortStage._id = -1;
    } else {
      // default: newest updated first
      sortStage.updatedAt = -1;
      sortStage._id = -1;
    }
    pipeline.push({ $sort: sortStage });

    // 10) Pagination + total
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    });

    // 11) Execute
    const [agg] = await BuyBox.aggregate(pipeline);
    const total = agg?.total?.[0]?.count || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      ok: true,
      page,
      limit,
      total,
      pages,
      seller: sellerFilter,
      buybox: bbFilter,
      channel: channelFilter,
      q,
      priceOp,
      price,
      priceMin,
      priceMax,
      priceSort,
      result: agg?.data ?? [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
