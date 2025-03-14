const express = require("express");
const axios = require("axios");
const cors = require("cors");

const colors = require("colors");

const mongoose = require("mongoose");
const Agenda = require("agenda");
const moment = require("moment-timezone");
const cron = require("node-cron");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const crypto = require('crypto');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const session = require('express-session');
// const { authenticateUser } = require('./src/middleware/authMiddleware');
const { agenda, autoJobsAgenda } = require("./src/price-obo/Agenda");
const routes = require("./src/price-obo/spRoute/priceRoute");
const commonRoutes = require("./src/price-obo/spRoute/commonRoute");
const autoPriceRoute = require("./src/price-obo/spRoute/autoPriceRoute");
const rotateClientSecret = require("./src/price-obo/rotateClientSecret");
const { scheduleCronJobs } = require("./src/price-obo/spRoute/cronJobRoute");
const { checkStockVsSales } = require("./src/notifications/stockAgainstSale");

const { stockVsSaleCronJobs } = require("./src/config/cron");const app = express();

const {loadSaleStockToFavourite } = require("./src/controller/favouriteController");
const { loadInventoryToProduct } = require("./src/controller/productController");
const { saveUserTokens } = require("./src/controller/accountController");

app.use(express.json());
app.use(cookieParser()); // To parse cookies

app.use(cors());
// app.use(cors({ 
//   origin: ["http://localhost:5173","https://app.priceobo.com"],
//   credentials: true, // Allow cookies to be sent
// }));
// app.options('*', cors()); // Enable pre-flight for all routes
// const allowedOrigins = ['http://localhost:5173', 'https://api.priceobo.com'];

// app.use(cors({
//   origin: function (origin, callback) {

//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
// }));

const MONGO_URI = process.env.MONGO_URI;
/*
const MONGO_URI = process.env.MONGO_URI;
// const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbizqwv.mongodb.net/po_canda?retryWrites=true&w=majority&appName=ppc-db`
// const MONGO_URI ="mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/dps?retryWrites=true&w=majority&appName=ppc-db";
*/

/*
const DB_URIS = {
  "ATVPDKIKX0DER": MONGO_URI,
  "A2EUQ1WTGCTBG2": `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbizqwv.mongodb.net/po_canda?retryWrites=true&w=majority&appName=ppc-db`,
};

app.use((req, res, next) => {
  req.marketplace_id = req.cookies.marketplace_id || "";
  next();
});

const connectToDatabase = async (marketplaceId) => {
  console.log("passed",marketplaceId);
  let mongoUri = DB_URIS[marketplaceId];
  if (!mongoUri) {
    mongoUri = MONGO_URI
  }

  const currentConnection = mongoose.connection;

  // Check if already connected to the correct database
  if (currentConnection.readyState === 1 && currentConnection.host === new URL(mongoUri).host) {
    console.log("Already connected to the correct database.");
    return; // No need to reconnect
  }

  // Disconnect only if connected to a different database
  if (currentConnection.readyState === 1) {
    console.log("Disconnecting from current database...");
    await mongoose.disconnect();
  }

  // Establish a new connection
  console.log(`Connecting to MongoDB for marketplace: ${marketplaceId}`);
  await mongoose.connect(mongoUri);
};

const DEFAULT_MARKETPLACE_ID = "ATVPDKIKX0DER";

app.use(async (req, res, next) => {
  let marketplaceId = req.cookies.marketplace_id || DEFAULT_MARKETPLACE_ID;
  console.log("cookie",marketplaceId);
 
  if (!marketplaceId) {
    // return res.status(400).json({ error: "Invalid or missing marketplace_id" });
    await connectToDatabase(marketplaceId);
  }


  try {
    await connectToDatabase(marketplaceId);
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Failed to connect to the database" });
  }
});

*/
// Example route to fetch marketplace data
app.get("/api/market", (req, res) => {
  console.log("Cookies received:", req.cookies);
  const marketplaceId = req.marketplace_id;

  res.json({ marketplaceId });
});

app.use((req, res, next) => {
  req.marketplace_id = req.cookies.marketplace_id || "";
  next();
});
app.get("/api/market", (req, res) => {
 
  const marketplaceId = req.marketplace_id;
  console.log(marketplaceId)
  res.json({ marketplaceId });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB!`.green.bold);
  })
  .catch((err) => {
    console.log(err);
  });

  const credentials = {
    refresh_token: process.env.REFRESH_TOKEN,
    lwa_app_id: process.env.LWA_APP_ID,
    lwa_client_secret: process.env.LWA_CLIENT_SECRET,
    seller_id: process.env.SELLER_ID,
    marketplace_id: process.env.MARKETPLACE_ID,
  };
/*
  const generateRandomState = () => {
    return crypto.randomBytes(16).toString("hex");
  };
  
  
  // passport.use(new OAuth2Strategy({
  //   // authorizationURL: 'https://sellercentral.amazon.com/apps/authorize',
  //   authorizationURL: `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${credentials.lwa_app_id}&state=${generateRandomState()}&version=beta`,
  //   tokenURL: 'https://api.amazon.com/auth/o2/token',
  //   clientID: credentials.lwa_app_id,
  //   clientSecret:  credentials.lwa_client_secret,
  //   callbackURL: 'https://api.priceobo.com/auth/callback'
  // },
  // async function(accessToken, refreshToken, profile, cb) {
  //   // Save the tokens and profile information
  //   console.log("acc token "+accessToken+"ref token: "+refreshToken+" profile: "+profile+" cb: "+cb);

  //   await saveUserTokens({accessToken,refreshToken,profile});

  //   return cb(null, { accessToken, refreshToken, profile });
  // }
  // ));

  passport.use(new OAuth2Strategy({
    // authorizationURL: `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${credentials.lwa_app_id}&state=${generateRandomState()}&version=beta`,
    authorizationURL: `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${credentials.lwa_app_id}&version=beta`,
    tokenURL: 'https://api.amazon.com/auth/o2/token',
    clientID: credentials.lwa_app_id,
    clientSecret: credentials.lwa_client_secret,
    callbackURL: 'https://api.priceobo.com/auth/callback'
  },
  async function(accessToken, refreshToken, profile, cb) {
    // Save the tokens and profile information
    console.log("acc token " + accessToken + " ref token: " + refreshToken + " profile: " + profile + " cb: " + cb);
  
    await saveUserTokens({accessToken, refreshToken, profile});
  
    return cb(null, { accessToken, refreshToken, profile });
  }
  ));
  
  
  // test
  // saveUserTokens({accessToken:"xxxxxxx",refreshToken:"yyyyy",profile:"zzzzz"});
  app.use(session({
    secret: 'HERER#$#$ES234234ererer',  // Change this to a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
  }));
  // app.get('/auth/amazon', passport.authenticate('oauth2'));
  app.get('/auth/amazon', (req, res, next) => {
    const state = generateRandomState();
    req.session.oauthState = state; // Store state in session
    passport.authenticate('oauth2', { state })(req, res, next);
  });
  
  // app.get('/auth/callback', 
  //   passport.authenticate('oauth2', { failureRedirect: '/' }),
  //   function(req, res) {
  //     // Successful authentication, redirect home.
  //     res.redirect('https://app.priceobo.com/account');
  //   }
  // );

  app.get('/auth/callback', 
    (req, res, next) => {
      if (!req.session || req.query.state !== req.session.oauthState) {
        return res.status(403).json({ success: false, message: "CSRF attack detected!" });
      }
      next();
    },
    passport.authenticate('oauth2', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('https://app.priceobo.com/account');
    }
  );
  
  
  const refreshAccessToken = async (refreshToken) => {
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      client_id: credentials.lwa_app_id,
      client_secret: credentials.lwa_client_secret,
      refresh_token: refreshToken,
    });
    return response.data.access_token;
  };

*/



agenda.on("ready", async () => {
  console.log("Agenda is connected and ready.");
  await agenda.start();
  reinitializeJobs();
  
});

//socket io connection
loadSaleStockToFavourite();
// loadReportSale();
// loadInventoryToProduct();

const reinitializeJobs = async () => {
  try {
    const jobs = await agenda.jobs({});

    jobs.forEach((job) => {
      const { name, data } = job.attrs;
      agenda.define(name, { priority: 10 }, async (job) => {
        const { sku, newPrice, revertPrice, originalPrice } = job.attrs.data;
        try {
          if (name.startsWith("monthly_price_update")) {
            await updateProductPrice(sku, newPrice);
            console.log(`Monthly Price updated for SKU: ${sku}`);
          } else if (name.startsWith("revert_monthly_price_update")) {
            await updateProductPrice(sku, revertPrice);
            console.log(`Monthly Price reverted for SKU: ${sku}`);
          } else if (name.startsWith("weekly_price_update")) {
            await updateProductPrice(sku, newPrice);
            console.log(`Weekly price updated for SKU: ${sku}`);
          } else if (name.startsWith("revert_weekly_price_update")) {
            await updateProductPrice(sku, revertPrice);
            console.log(`Weekly price reverted for SKU: ${sku}`);
          } else if (name.startsWith("schedule_price_update")) {
            await updateProductPrice(sku, newPrice);
            console.log(`Single day price updated for SKU: ${sku}`);
          } else if (name.startsWith("revert_price_update")) {
            await updateProductPrice(sku, originalPrice);
            console.log(`Single day price reverted for SKU: ${sku}`);
          }
        } catch (error) {
          console.error(`Failed to process job ${name} for SKU: ${sku}`, error);
        }
      });
    });
  } catch (error) {
    console.error("Failed to fetch jobs from the database", error);
  }
};

autoJobsAgenda.on("ready", async () => {
  console.log("Auto Agenda is connected and ready.");
  await autoJobsAgenda.start();
  reinitializeAutoJobs();
});


//  loadAndCacheJobs();
agenda.on("ready", async () => {
  cron.schedule("*/60 * * * *", async () => {
    try {
      await agenda.start();
      await loadAndCacheJobs();
    } catch (error) {
      console.error("Error during cron job execution:", error);
    }
  });
});

// agenda.on("start", async (job) => {
//   try {
//     await CachedJob.updateOne(
//       { name: job.attrs.name, nextRunAt: job.attrs.nextRunAt },
//       {
//         $set: {
//           lastRunAt: job.attrs.lastRunAt,
//           nextRunAt: job.attrs.nextRunAt,
//           data: job.attrs.data,
//           updatedAt: new Date(),
//         },
//       },
//       { upsert: true }
//     );
//     console.log(`Cached job started: ${job.attrs.name}`);
//   } catch (error) {
//     console.error("Error updating cache on job start:", error);
//   }
// });

agenda.on("complete", async (job) => {
  try {
    await CachedJob.updateOne(
      { name: job.attrs.name },
      {
        $set: {
          lastRunAt: job.attrs.lastRunAt,
          data: job.attrs.data,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`Cached job completed: ${job.attrs.name}`);
  } catch (error) {
    console.error("Error updating cache on job completion:", error);
  }
});

// rotateClientSecret();
// stockVsSaleCronJobs()
// checkStockVsSales()





app.use(routes);
app.use(commonRoutes);
app.use(autoPriceRoute);
scheduleCronJobs();

app.get("/", (req, res) => {
  res.send("Server is running!");
});



const updateProductPrice = require("./src/price-obo/UpdatePrice/UpdatePrice");
const productRoute = require("./src/route/product")

const reinitializeAutoJobs = require("./src/price-obo/JobSchedule/InitializeJobs");
const CachedJob = require("./src/model/CachedJob");
const loadAndCacheJobs = require("./src/caching/cacheJob");


const scheduleRoute = require("./src/route/Schedule");
const authRoute = require("./src/route/auth");
const userRoute = require("./src/route/user");
const historyRoute = require("./src/route/history");
const accountRoute = require("./src/route/account");
const notificationRoute = require("./src/route/notification");
const ownerNotificationRoute= require("./src/route/ownernotification")
const sellerRoute = require("./src/route/seller");
const subscriptionRoute = require("./src/route/subscription");
const pricingplanRoute = require("./src/route/pricingplan");
const messageRoute = require("./src/route/message");
// const billingRoute = require("./src/route/billing");
const favouriteRoute = require("./src/route/favourite");
const automationRoute = require("./src/route/automation");
const tagRoute = require("./src/route/tag");
const productGroup = require("./src/route/productGroup");

app.use("/api/schedule", scheduleRoute);
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/histories", historyRoute);
app.use("/api/account", accountRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/product",productRoute);
app.use("/api/ownernotification",ownerNotificationRoute);
app.use("/api/seller",sellerRoute);app.use("/api/subscription",subscriptionRoute);
app.use("/api/pricing",pricingplanRoute);
app.use("/api/message",messageRoute);
// app.use("/api/billing",billingRoute);
app.use("/api/automation",automationRoute);
app.use("/api/favourite",favouriteRoute);
app.use("/api/tag",tagRoute);
app.use("/api/group",productGroup);
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
