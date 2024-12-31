const express = require("express");
const axios = require("axios");
const cors = require("cors");
const colors = require("colors");
const dayjs = require("dayjs");
const mongoose = require("mongoose");
const Agenda = require("agenda");
const moment = require("moment-timezone");
const cron = require("node-cron");
require("dotenv").config();
const cookieParser = require("cookie-parser");

// const { authenticateUser } = require('./src/middleware/authMiddleware');
const { agenda, autoJobsAgenda } = require("./src/price-obo/Agenda");
const routes = require("./src/price-obo/spRoute/priceRoute");
const commonRoutes = require("./src/price-obo/spRoute/commonRoute");
const autoPriceRoute = require("./src/price-obo/spRoute/autoPriceRoute");
const rotateClientSecret = require("./src/price-obo/rotateClientSecret");
const { scheduleCronJobs } = require("./src/price-obo/spRoute/cronJobRoute");
const { checkStockVsSales } = require("./src/notifications/stockAgainstSale");

const { stockVsSaleCronJobs } = require("./src/config/cron");const app = express();



app.use(express.json());
app.use(cookieParser()); // To parse cookies

app.use(cors());
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

// const MONGO_URI ="mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/dps?retryWrites=true&w=majority&appName=ppc-db";

app.use((req, res, next) => {
  req.marketplace_id = req.cookies.marketplace_id || "";
  next();
});
app.get("/api/market", (req, res) => {
  const marketplaceId = req.marketplace_id;

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


agenda.on("ready", async () => {
  console.log("Agenda is connected and ready.");
  await agenda.start();
  reinitializeJobs();
});

//socket io connection


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

const automationRoute = require("./src/route/automation");
const Message = require("./src/model/Message");

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
