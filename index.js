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

const {loadSaleStockToFavourite, loadReportSale } = require("./src/controller/favouriteController");
const { loadInventoryToProduct } = require("./src/controller/productController");
const { saveUserTokens } = require("./src/controller/accountController");
// const PushService = require('./src/service/pushService');

const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });
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

const config = {
  clientKey: '6gi3nino9sia3',
  clientSecret: '18da778e456044d348a5ae6639dd519893d2db59',
  redirectUri: 'https://api.priceobo.com/auth/callback',
  authUrl: 'https://auth.tiktok-shops.com/oauth/authorize',
  tokenUrl: 'https://auth.tiktok-shops.com/api/v2/token/get',
  apiVersion: '202309',
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-heresdfhsdsdsdsd'
};

// In-memory storage (use a database in production)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Set view engine for basic UI
// app.set('view engine', 'ejs');

// ==============================================
// HELPER FUNCTIONS
// ==============================================

// Token storage (in-memory for development - use database in production)
const tokenStore = {};

/**
 * Generates a random state string for OAuth security
 */
function generateStateString() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates API signature required by TikTok
 * @param {Object} params - Request parameters
 * @param {String} secret - Client secret
 */
function generateSignature(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map(key => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

/**
 * Refreshes access token if expired
 * @param {Object} req - Express request object
 */
async function refreshTokenIfNeeded(req) {
  const userToken = tokenStore[req.session.userId];
  if (!userToken) throw new Error('No active session');

  if (Date.now() >= userToken.expiresAt) {
    const response = await axios.post(config.tokenUrl, null, {
      params: {
        app_key: config.clientKey,
        app_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: userToken.refreshToken,
        version: config.apiVersion
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { access_token, refresh_token, expires_in } = response.data.data;
    
    userToken.accessToken = access_token;
    userToken.refreshToken = refresh_token || userToken.refreshToken;
    userToken.expiresAt = Date.now() + (expires_in * 1000);
  }
}

// ==============================================
// AUTHENTICATION ROUTES
// ==============================================

/**
 * Initiates OAuth flow
 */
app.get('/auth', (req, res) => {
  // Safely regenerate session to avoid using a destroyed one
  req.session.regenerate((err) => {
    if (err) {
      console.error("Session regeneration error:", err);
      return res.status(500).send("Failed to start session");
    }

    const state = generateStateString();
    req.session.state = state;

    const authParams = {
      app_key: config.clientKey,
      state: state,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      version: config.apiVersion
    };

    const authUrl = `${config.authUrl}?${require('querystring').stringify(authParams)}`;
    res.redirect(authUrl);
  });
});


/**
 * Handles OAuth callback
 */
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Validate state parameter
    if (!state || state !== req.session.state) {
      return res.status(400).render('error', { 
        message: 'Invalid state parameter' 
      });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post(config.tokenUrl, null, {
      params: {
        app_key: config.clientKey,
        app_secret: config.clientSecret,
        auth_code: code,
        grant_type: 'authorized_code',
        version: config.apiVersion
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Token Response:', tokenResponse.data);
    const { access_token, refresh_token, expires_in, shop_id } = tokenResponse.data.data;
     console.log('Access Token:', access_token);
    // Store tokens
    req.session.userId = `user_${Date.now()}`;
    tokenStore[req.session.userId] = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      shopId: shop_id,
      shopInfo: null
    };

    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('Authorization error:', error.response?.data || error.message);
    res.status(500).render('error', {
      message: 'Authorization failed',
      error: error.response?.data || error.message
    });
  }
});

// ==============================================
// API ROUTES
// ==============================================

/**
 * Gets authorized shops for the authenticated seller
 */
app.get('/api/shops', async (req, res) => {
  try {
    // Check authentication
    if (!req.session.userId || !tokenStore[req.session.userId]) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Please authenticate first'
      });
    }

    const userToken = tokenStore[req.session.userId];

    // Refresh token if needed
    await refreshTokenIfNeeded(req);

    // Prepare request parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      app_key: config.clientKey,
      timestamp: timestamp,
      version: config.apiVersion
    };

    // Generate signature
    params.sign = generateSignature(params, config.clientSecret);

    // Make API request
    const response = await axios.get(`${config.apiBaseUrl}/api/shop/get_authorized_shop`, {
      params: params,
      headers: {
        'x-tts-access-token': userToken.accessToken
      }
    });

    // Update shop info
    userToken.shopInfo = response.data.data.shop_list[0];

    // Return response
    res.json({
      code: 0,
      data: response.data.data,
      message: 'Success',
      request_id: response.headers['x-tts-trace-id']
    });

  } catch (error) {
    console.error('Get Authorized Shop Error:', error.response?.data || error.message);
    res.status(500).json({
      code: 'API_ERROR',
      message: 'Failed to fetch authorized shops',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Gets order list for the authenticated shop
 */
app.get('/orders', async (req, res) => {
  try {
    // Check authentication
    if (!req.session.userId || !tokenStore[req.session.userId]) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Please authenticate first'
      });
    }

    const userToken = tokenStore[req.session.userId];

    // Refresh token if needed
    await refreshTokenIfNeeded(req);

    // Prepare request parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      app_key: config.clientKey,
      timestamp: timestamp,
      shop_id: userToken.shopId,
      version: config.apiVersion
    };

    // Generate signature
    params.sign = generateSignature(params, config.clientSecret);

    // Prepare request body
    const requestBody = {
      page_size: 10,
      order_status: 4 // READY_TO_SHIP
    };

    // Make API request
    const response = await axios.post(`${config.apiBaseUrl}/api/orders/search`, requestBody, {
      params: params,
      headers: {
        'Content-Type': 'application/json',
        'x-tts-access-token': userToken.accessToken
      }
    });

    // Return response
    res.json({
      code: 0,
      data: response.data.data,
      message: 'Success',
      request_id: response.headers['x-tts-trace-id']
    });

  } catch (error) {
    console.error('Get Orders Error:', error.response?.data || error.message);
    res.status(500).json({
      code: 'API_ERROR',
      message: 'Failed to fetch orders',
      details: error.response?.data || error.message
    });
  }
});

async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(config.tokenUrl, null, {
      params: {
        app_key: config.clientKey,
        app_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        version: config.apiVersion
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { access_token, refresh_token, expires_in } = response.data.data;
    
    // Update token store
    tokenStore = {
      ...tokenStore,
      accessToken: access_token,
      refreshToken: refresh_token || tokenStore.refreshToken, // Keep old if not provided
      expiresAt: Date.now() + (expires_in * 1000)
    };

    return access_token;
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
}
app.get('/', async (req, res) => {
  try {
    const userToken = req.session.userId ? tokenStore[req.session.userId] : null;
    
    // If authenticated but no shop info, fetch it
    if (userToken && !userToken.shopInfo) {
      await refreshTokenIfNeeded(req);
      const timestamp = Math.floor(Date.now() / 1000);
      const params = {
        app_key: config.clientKey,
        timestamp: timestamp,
        version: config.apiVersion
      };
      params.sign = generateSignature(params, config.clientSecret);

      const shopResponse = await axios.get(`${config.apiBaseUrl}/api/shop/get_authorized_shop`, {
        params,
        headers: {
          'x-tts-access-token': userToken.accessToken
        }
      });
      userToken.shopInfo = shopResponse.data.data.shop_list[0];
    }

    res.render('index', {
      authenticated: !!userToken?.accessToken,
      shopInfo: userToken?.shopInfo
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('error', {
      message: 'Failed to load page',
      error: error.message
    });
  }
});

/**
 * Logout
 */
app.get('/logout', (req, res) => {
  if (req.session.userId) {
    delete tokenStore[req.session.userId];
  }
  req.session.destroy();
  res.redirect('/');
});

// ==============================================
// ERROR HANDLING
// ==============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});





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




PushService.init(io);

io.on('connection', socket => {
  const userId = socket.handshake.query.userId;
  socket.join(userId);
});
*/


agenda.on("ready", async () => {
  console.log("Agenda is connected and ready.");
  await agenda.start();
  reinitializeJobs();
  
});

//socket io connection
// loadSaleStockToFavourite();
// loadReportSale();
// loadInventoryToProduct();

const reinitializeJobs = async () => {
  try {
    const jobs = await agenda.jobs({});
    // const jobs = await agenda.jobs(
    //   { nextRunAt: { $ne: null } }, 
    //   {},    
    //   100                                       
    // );
    


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
// const accountRoute = require("./src/route/account");
const notificationRoute = require("./src/route/notification");
// const ownerNotificationRoute= require("./src/route/ownernotification")
const sellerRoute = require("./src/route/seller");
// const subscriptionRoute = require("./src/route/subscription");
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
// app.use("/api/account", accountRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/product",productRoute);
// app.use("/api/ownernotification",ownerNotificationRoute);
// app.use("/api/seller",sellerRoute);app.use("/api/subscription",subscriptionRoute);
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

// server.listen(3000, () => {
//   console.log("🚀 Server running on port 3000");
// });
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
