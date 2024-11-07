const express = require('express');
const axios = require('axios');
const cors = require('cors');
const colors = require("colors");
const dayjs = require('dayjs'); 
const mongoose = require('mongoose');
const Agenda = require('agenda');
const moment = require('moment-timezone');
const cron = require('node-cron');
require('dotenv').config();
const cookieParser = require('cookie-parser');

// const { authenticateUser } = require('./src/middleware/authMiddleware');


const app = express();
app.use(express.json());
app.use(cookieParser());  // To parse cookies

app.use(cors());
app.options('*', cors()); // Enable pre-flight for all routes
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

// const MONGO_URI = "mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/dps?retryWrites=true&w=majority&appName=ppc-db";
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


const agenda = new Agenda({ db: { address: MONGO_URI, collection: 'jobs' } });

// const agenda = new Agenda({
//   db: { address: MONGO_URI, collection: 'jobs' },
//   timezone: 'America/New_York', // Schedule jobs to run in New York time
// });

const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};

// Function to update product price
const updateProductPrice = async (sku, value) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/listings/2021-08-01/items/${credentials.seller_id}/${encodeURIComponent(sku)}`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'PATCH',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: { marketplaceIds: credentials.marketplace_id },
    data: {
      productType: 'PRODUCT',
      patches: [
        {
          op: 'replace',
          path: '/attributes/purchasable_offer',
          value: [
            {
              marketplace_id: credentials.marketplace_id,
              currency: 'USD',
              our_price: [{ schedule: [{ value_with_tax: `${value.toFixed(2)}` }] }],
            },
          ],
        },
      ],
    },
  };

  try {
    const response = await axios(request);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating product price:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/*
async function defineWeeklyJobEdt(sku, day, timeSlot) {
  console.log("timeSlot: "+JSON.stringify(timeSlot.startTime));

  const jobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.startTime}`;
  console.log(jobName);
  const revertJobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.endTime}`; // Ensure unique job name for each time slot
  agenda.define(jobName, { priority: 5 }, async (job) => {
    const { sku, newPrice} = job.attrs.data;

    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}, day: ${day}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply weekly price update for SKU: ${sku}, day: ${day}, slot: ${timeSlot.startTime}`, error);
    }
  });

  agenda.define(`revert_${revertJobName}`, { priority: 5 }, async (job) => {
    const { sku, revertPrice} = job.attrs.data;

    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, day: ${day}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, day: ${day}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

const scheduleWeeklyPriceChangeFromEdt = async (sku, weeklyTimeSlots,scheduleId) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {  // Ensure you're passing the correct timeSlot object here
      console.log(day + timeSlot.startTime);     
      
      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');

      const updateCron = `${startMinute} ${startHour} * * ${day}`;
      const revertCron = `${endMinute} ${endHour} * * ${day}`;

      // Ensure unique job names for each time slot
      const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHour}:${endMinute}`;

      // Pass the correct timeSlot object
      await defineWeeklyJobEdt(sku, day, timeSlot);  // Pass timeSlot, not timeSlots

      await agenda.every(updateCron, updateJobName, { sku, newPrice:timeSlot.newPrice,day,scheduleId});
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${timeSlot.startTime}`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice:timeSlot.revertPrice, day,scheduleId});
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${timeSlot.endTime}`);
    }
  }
};*/

// const moment = require('moment-timezone');

// Helper function to convert a time from EDT to UTC
const convertEdtToUtc = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);

  // Create a moment object with the current date in America/New_York timezone (EDT)
  const edtMoment = moment.tz({ hour: hours, minute: minutes }, "America/New_York");

  // Convert the EDT time to UTC
  const utcMoment = edtMoment.clone().utc();
  
  return {
    hour: utcMoment.hours(),
    minute: utcMoment.minutes()
  };
};

// Define weekly job with converted times from EDT to UTC
/*
async function defineWeeklyJobUtc(sku, day, timeSlot) {
  const jobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.startTime}`;
  const revertJobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.endTime}`;
  
  // Define the job in Agenda for price update
  agenda.define(jobName, async (job) => {
    const { sku, newPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}, day: ${day}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply weekly price update for SKU: ${sku}, day: ${day}, slot: ${timeSlot.startTime}`, error);
    }
  });

  // Define the job in Agenda for price revert
  agenda.define(`revert_${revertJobName}`, async (job) => {
    const { sku, revertPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, day: ${day}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, day: ${day}, slot: ${timeSlot.endTime}`, error);
    }
  });
}
  */
const convertEdtToUtcWithDayAdjustment = (timeString, day) => {
  const [hours, minutes] = timeString.split(":").map(Number);

  // Create a moment object with the time in America/New_York timezone (EDT)
  const edtMoment = moment.tz({ hour: hours, minute: minutes }, "America/New_York");

  // Convert EDT time to UTC
  const utcMoment = edtMoment.clone().utc();

  // Calculate new day if UTC time crosses midnight
  let newDay = day;
  if (utcMoment.date() !== edtMoment.date()) {
    // If the day rolled over, increment day (mod 7 to wrap around week)
    newDay = (newDay + 1) % 7;
  }

  return {
    hour: utcMoment.hours(),
    minute: utcMoment.minutes(),
    day: newDay,
  };
};

async function defineWeeklyJobUtc(sku, startDay, endDay, timeSlot) {
  const jobName = `weekly_price_update_${sku}_day_${startDay}_slot_${timeSlot.startTime}`;
  const revertJobName = `revert_weekly_price_update_${sku}_day_${endDay}_slot_${timeSlot.endTime}`;

  // Define the job in Agenda for price update
  agenda.define(jobName, async (job) => {
    const { sku, newPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}, day: ${startDay}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply weekly price update for SKU: ${sku}, day: ${startDay}, slot: ${timeSlot.startTime}`, error);
    }
  });

  // Define the job in Agenda for price revert
  agenda.define(revertJobName, async (job) => {
    const { sku, revertPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, day: ${endDay}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, day: ${endDay}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

const scheduleWeeklyPriceChangeFromEdt = async (sku, weeklyTimeSlots, scheduleId) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {
      // Convert start and end times from EDT to UTC, adjusting days if necessary
      const startTimeUtc = convertEdtToUtcWithDayAdjustment(timeSlot.startTime, Number(day));
      const endTimeUtc = convertEdtToUtcWithDayAdjustment(timeSlot.endTime, Number(day));

      // Build cron expressions for UTC times with adjusted day
      const updateCron = `${startTimeUtc.minute} ${startTimeUtc.hour} * * ${startTimeUtc.day}`;
      const revertCron = `${endTimeUtc.minute} ${endTimeUtc.hour} * * ${endTimeUtc.day}`;
      
      const updateJobName = `weekly_price_update_${sku}_day_${startTimeUtc.day}_slot_${timeSlot.startTime}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${endTimeUtc.day}_slot_${timeSlot.endTime}`;

      // Pass the adjusted days to defineWeeklyJobUtc function
      await defineWeeklyJobUtc(sku, startTimeUtc.day, endTimeUtc.day, timeSlot);

      // Schedule the jobs in UTC timezone
      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, day: startTimeUtc.day, scheduleId }, { timezone: 'UTC' });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${startTimeUtc.day} at ${timeSlot.startTime} EDT (${startTimeUtc.hour}:${startTimeUtc.minute} UTC)`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, day: endTimeUtc.day, scheduleId }, { timezone: 'UTC' });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${endTimeUtc.day} at ${timeSlot.endTime} EDT (${endTimeUtc.hour}:${endTimeUtc.minute} UTC)`);
    }
  }
};


// Schedule weekly price change with EDT to UTC conversion
/*
const scheduleWeeklyPriceChangeFromEdt = async (sku, weeklyTimeSlots, scheduleId) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {
      // Convert start and end times from EDT to UTC
      const startTimeUtc = convertEdtToUtc(timeSlot.startTime);
      const endTimeUtc = convertEdtToUtc(timeSlot.endTime);

      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');
      // Build cron expressions for UTC times
      const updateCron = `${startTimeUtc.minute} ${startTimeUtc.hour} * * ${day}`;
      const revertCron = `${endTimeUtc.minute} ${endTimeUtc.hour} * * ${day}`;
      
      const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHour}:${endMinute}`;

      // Pass the timeSlot to the defineWeeklyJobUtc function
      await defineWeeklyJobUtc(sku, day, timeSlot);

      // Schedule the jobs in UTC timezone
      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, day, scheduleId }, { timezone: 'UTC' });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${timeSlot.startTime} EDT (${startTimeUtc.hour}:${startTimeUtc.minute} UTC)`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, day, scheduleId }, { timezone: 'UTC' });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${timeSlot.endTime} EDT (${endTimeUtc.hour}:${endTimeUtc.minute} UTC)`);
    }
  }
};
*/
/*
const convertBSTtoUTCForEDT = (inputTime) => {
  const [hours, minutes] = inputTime.split(':').map(Number);

  // Step 1: Add 10 hours to get EDT equivalent (Bangladesh is UTC+6, EDT is UTC-4)
  let edtHours = hours + 6;

  // Handle edge cases where time exceeds 24 hours
  if (edtHours >= 24) {
    edtHours -= 24; // Wrap around if the hours go above 24
  }

  // Step 2: Treat the result as New York time (EDT) and convert it to UTC
  const now = new Date(); // Get today's date
  const edtTime = new Date(now);
  edtTime.setHours(edtHours, minutes, 0, 0);

  // Step 3: Convert EDT time to UTC
  const utcTime = new Date(edtTime.getTime() + (4 * 60 * 60 * 1000)); // EDT is UTC-4, so add 4 hours
  console.log(`Input Time: ${inputTime} BST -> ${edtTime} EDT -> ${utcTime} UTC`);

  return utcTime;
};
*/

/*
const convertBSTtoUTCForEDT = (inputTime) => {
  // Step 1: Parse the input time from Bangladesh time zone (BST)
  const [hours, minutes] = inputTime.split(':').map(Number);

  // Step 2: Get the current date in Bangladesh (BST)
  const currentDateInBST = moment.tz('Asia/Dhaka').set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0
  });

  // Step 3: Treat the time as if it's in New York time (EDT)
  const edtDateTime = currentDateInBST.tz('America/New_York', true); // Same time, but treat it as New York time

  // Step 4: Convert the New York (EDT) time to UTC
  const utcDateTime = edtDateTime.utc(); // Convert EDT to UTC

  console.log(`Input Time (BST): ${inputTime} -> Treated as EDT: ${edtDateTime.format()} -> Scheduled in UTC: ${utcDateTime.format()}`);

  return utcDateTime.toDate(); // Return the Date object in UTC
};


// const convertTimeToUtc = (time) => {
//   return moment(time).utc().format("HH:mm");
// };

async function defineWeeklyJob(sku, day, timeSlot) {
  // Convert start and end times from Bangladesh (BST) to UTC for scheduling
  // const utctStartTime = convertTimeToUtc(timeSlot.startTime);
  // const utcEndTime = convertTimeToUtc(timeSlot.endTime);
  const startTimeInUTC = convertBSTtoUTCForEDT(timeSlot.startTime);
  const endTimeInUTC = convertBSTtoUTCForEDT(timeSlot.endTime);

  // Get the UTC hours and minutes
  const startHourUTC = startTimeInUTC.getUTCHours();
  const startMinuteUTC = startTimeInUTC.getUTCMinutes();
  const endHourUTC = endTimeInUTC.getUTCHours();
  const endMinuteUTC = endTimeInUTC.getUTCMinutes();

  console.log(`Job Start Time in UTC: ${startHourUTC}:${startMinuteUTC}, End Time in UTC: ${endHourUTC}:${endMinuteUTC}`);

  const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHourUTC}:${startMinuteUTC}`;
  const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHourUTC}:${endMinuteUTC}`;

  // Define the job in Agenda for price update
  agenda.define(updateJobName, { priority: 5 }, async (job) => {
    const { sku, newPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Price updated for SKU: ${sku} at ${startTimeInUTC} UTC`);
    } catch (error) {
      console.error(`Failed to update price for SKU: ${sku}`, error);
    }
  });

  // Define the job in Agenda for price revert
  agenda.define(revertJobName, { priority: 5 }, async (job) => {
    const { sku, revertPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku} at ${endTimeInUTC} UTC`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}`, error);
    }
  });
}



const scheduleWeeklyPriceChange = async (sku, weeklyTimeSlots, scheduleId) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {
      // Convert start and end times based on user time zone (Bangladesh BST -> EDT -> UTC)

      console.log("startTime "+timeSlot.startTime);
      // const utctStartTime = convertTimeToUtc(timeSlot.startTime);
      // const utcEndTime = convertTimeToUtc(timeSlot.endTime);
      const startTimeInUTC = convertBSTtoUTCForEDT(timeSlot.startTime);
      const endTimeInUTC = convertBSTtoUTCForEDT(timeSlot.endTime);
      console.log("startTimeInUTC "+startTimeInUTC);
      // Get the UTC hours and minutes
      const startHourUTC = startTimeInUTC.getUTCHours();
      const startMinuteUTC = startTimeInUTC.getUTCMinutes();
      const endHourUTC = endTimeInUTC.getUTCHours();
      const endMinuteUTC = endTimeInUTC.getUTCMinutes();

      // Cron expressions
      const updateCron = `${startMinuteUTC} ${startHourUTC} * * ${day}`;
      const revertCron = `${endMinuteUTC} ${endHourUTC} * * ${day}`;

      const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHourUTC}:${startMinuteUTC}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHourUTC}:${endMinuteUTC}`;
      await defineWeeklyJob(sku, day, timeSlot);  // Pass timeSlot, not timeSlots

      // Schedule the jobs in UTC (which aligns with EDT)
      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, day, scheduleId }, { timezone: "UTC" });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${startHourUTC}:${startMinuteUTC} UTC`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, day, scheduleId }, { timezone: "UTC" });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${endHourUTC}:${endMinuteUTC} UTC`);
    }
  }
};
*/

const convertBSTtoUTCForEDT = (inputTime) => {
  const [hours, minutes] = inputTime.split(':').map(Number);
  const currentDateInBST = moment.tz('Asia/Dhaka').set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });

  const edtDateTime = currentDateInBST.tz('America/New_York', true);
  const utcDateTime = edtDateTime.utc();
  return utcDateTime.toDate();
};

async function defineWeeklyJob(sku, startDay, endDay, timeSlot) {
  const startTimeInUTC = convertBSTtoUTCForEDT(timeSlot.startTime);
  const endTimeInUTC = convertBSTtoUTCForEDT(timeSlot.endTime);

  const startHourUTC = startTimeInUTC.getUTCHours();
  const startMinuteUTC = startTimeInUTC.getUTCMinutes();
  const endHourUTC = endTimeInUTC.getUTCHours();
  const endMinuteUTC = endTimeInUTC.getUTCMinutes();

  const updateJobName = `weekly_price_update_${sku}_day_${startDay}_slot_${timeSlot.startTime}`;
  const revertJobName = `revert_weekly_price_update_${sku}_day_${endDay}_slot_${timeSlot.endTime}`;

  agenda.define(updateJobName, { priority: 5 }, async (job) => {
    const { sku, newPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Price updated for SKU: ${sku} at ${startTimeInUTC} UTC`);
    } catch (error) {
      console.error(`Failed to update price for SKU: ${sku}`, error);
    }
  });

  agenda.define(revertJobName, { priority: 5 }, async (job) => {
    const { sku, revertPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku} at ${endTimeInUTC} UTC`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}`, error);
    }
  });
}

const scheduleWeeklyPriceChange = async (sku, weeklyTimeSlots, scheduleId) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {
      let adjustedStartDay = Number(day);
      let adjustedEndDay = Number(day);

      if (Number(timeSlot.startTime.split(":")[0]) >= 20) {
        adjustedStartDay = (adjustedStartDay + 1) % 7;
      }
      if (Number(timeSlot.endTime.split(":")[0]) >= 20) {
        adjustedEndDay = (adjustedEndDay + 1) % 7;
      }

      const startTimeInUTC = convertBSTtoUTCForEDT(timeSlot.startTime);
      const endTimeInUTC = convertBSTtoUTCForEDT(timeSlot.endTime);

      const startHourUTC = startTimeInUTC.getUTCHours();
      const startMinuteUTC = startTimeInUTC.getUTCMinutes();
      const endHourUTC = endTimeInUTC.getUTCHours();
      const endMinuteUTC = endTimeInUTC.getUTCMinutes();

      const updateCron = `${startMinuteUTC} ${startHourUTC} * * ${adjustedStartDay}`;
      const revertCron = `${endMinuteUTC} ${endHourUTC} * * ${adjustedEndDay}`;

      const updateJobName = `weekly_price_update_${sku}_day_${adjustedStartDay}_slot_${timeSlot.startTime}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${adjustedEndDay}_slot_${timeSlot.endTime}`;

      await defineWeeklyJob(sku, adjustedStartDay, adjustedEndDay, timeSlot);

      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, day: adjustedStartDay, scheduleId }, { timezone: "UTC" });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${adjustedStartDay} at ${startHourUTC}:${startMinuteUTC} UTC`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, day: adjustedEndDay, scheduleId }, { timezone: "UTC" });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${adjustedEndDay} at ${endHourUTC}:${endMinuteUTC} UTC`);
    }
  }
};



/*
const scheduleWeeklyPriceChange = async (sku, weeklyTimeSlots,scheduleId) => {
  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {  // Ensure you're passing the correct timeSlot object here
      console.log(day + timeSlot.startTime);     

      // Destructure start and end time
      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');

      // Define cron expressions for scheduling jobs
      const updateCron = `${startMinute} ${startHour} * * ${day}`;
      const revertCron = `${endMinute} ${endHour} * * ${day}`;

      // Ensure unique job names for each time slot
      const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHour}:${endMinute}`;

      // Add timeSlotScheduleId to the job data
     

      // Schedule the price update job with timeSlotScheduleId
      await agenda.every(updateCron, updateJobName, { 
        sku, 
        newPrice: timeSlot.newPrice, 
        day, 
        scheduleId
      });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${timeSlot.startTime}`);

      // Schedule the price revert job with timeSlotScheduleId
      await agenda.every(revertCron, revertJobName, { 
        sku, 
        revertPrice: timeSlot.revertPrice, 
        day, 
        scheduleId
      });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${timeSlot.endTime}`);
    }
  }
};

*/
/*
async function defineMonthlyJobEdt(sku, date, timeSlot) {
  const jobName = `monthly_price_update_${sku}_date_${date}_slot_${timeSlot.startTime}`; // Ensure unique job name for each time slot
  const revertJobName = `monthly_price_update_${sku}_date_${date}_slot_${timeSlot.endTime}`;

  agenda.define(jobName, { priority: 10 }, async (job) => {
    const { sku, newPrice,scheduleId } = job.attrs.data;

    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Monthly price update applied for SKU: ${sku}, new price: ${newPrice}, date: ${date}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply monthly price update for SKU: ${sku}, date: ${date}, slot: ${timeSlot.startTime}`, error);
    }
  });

  agenda.define(`revert_${revertJobName}`, { priority: 10 }, async (job) => {
    const { sku, revertPrice} = job.attrs.data;

    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, date: ${date}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, date: ${date}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

const  scheduleMonthlyPriceChangeFromEdt = async (sku, monthlySlots, scheduleId) => {
  for (const [date, timeSlots] of Object.entries(monthlySlots)) {
    for (const timeSlot of timeSlots) {  // Pass each specific timeSlot here
     
      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');

      const updateCron = `${startMinute} ${startHour} ${date} * *`;
      const revertCron = `${endMinute} ${endHour} ${date} * *`;

      // Ensure unique job names for each time slot
      const updateJobName = `monthly_price_update_${sku}_date_${date}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_monthly_price_update_${sku}_date_${date}_slot_${endHour}:${endMinute}`;

      // Define and schedule the update and revert jobs
      await defineMonthlyJobEdt(sku, date, timeSlot);  // Pass timeSlot, not timeSlots

      await agenda.every(updateCron, updateJobName, { sku, newPrice:timeSlot.newPrice, date,scheduleId}, { priority: 10 });
      console.log(`Scheduled monthly price update for SKU: ${sku} on date ${date} at ${timeSlot.startTime}`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice:timeSlot.revertPrice, date,scheduleId}, { priority: 10 });
      console.log(`Scheduled monthly price revert for SKU: ${sku} on date ${date} at ${timeSlot.endTime}`);
    }
  }
};*/
// Define monthly job with converted times from EDT to UTC

const convertEdtToUtcWithDayAdjustmentMonthly = (timeString, date) => {
  const [hours, minutes] = timeString.split(":").map(Number);

  // Create a moment object with the time in America/New_York timezone (EDT)
  const edtMoment = moment.tz({ hour: hours, minute: minutes }, "America/New_York");

  // Convert EDT time to UTC
  const utcMoment = edtMoment.clone().utc();

  // Calculate new day if UTC time crosses midnight
  let newDay = date;
  if (utcMoment.date() !== edtMoment.date()) {
    // If the day rolled over, increment day (mod 7 to wrap around week)
    newDay = (newDay + 1) % 31;
  }

  return {
    hour: utcMoment.hours(),
    minute: utcMoment.minutes(),
    date: newDay,
  };
};

async function defineMonthlyJobUtc(sku, startDate,endDate, timeSlot) {
  const jobName = `monthly_price_update_${sku}_date_${startDate}_slot_${timeSlot.startTime}`; 
  const revertJobName = `monthly_price_update_${sku}_date_${endDate}_slot_${timeSlot.endTime}`;

  // Define the job in Agenda for price update
  agenda.define(jobName, async (job) => {
    const { sku, newPrice, scheduleId } = job.attrs.data;

    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Monthly price update applied for SKU: ${sku}, new price: ${newPrice}, date: ${startDate}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply monthly price update for SKU: ${sku}, date: ${startDate}, slot: ${timeSlot.startTime}`, error);
    }
  });

  // Define the job in Agenda for price revert
  agenda.define(`revert_${revertJobName}`, { priority: 10 }, async (job) => {
    const { sku, revertPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, date: ${endDate}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, date: ${endDate}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

// Schedule monthly price change with EDT to UTC conversion
const scheduleMonthlyPriceChangeFromEdt = async (sku, monthlySlots, scheduleId) => {
  for (const [date, timeSlots] of Object.entries(monthlySlots)) {
    for (const timeSlot of timeSlots) {
      
      // Convert start and end times from EDT to UTC
      const startTimeUtc = convertEdtToUtcWithDayAdjustmentMonthly(timeSlot.startTime,Number(date));
      const endTimeUtc = convertEdtToUtcWithDayAdjustmentMonthly(timeSlot.endTime,Number(date));

      const [startHour, startMinute] = timeSlot.startTime.split(':');
      const [endHour, endMinute] = timeSlot.endTime.split(':');
      // Build cron expressions for UTC times
      const updateCron = `${startTimeUtc.minute} ${startTimeUtc.hour} ${startTimeUtc.date} * *`;
      const revertCron = `${endTimeUtc.minute} ${endTimeUtc.hour} ${endTimeUtc.date} * *`;

      // const updateJobName = `monthly_price_update_${sku}_date_${date}_slot_${startTimeUtc.hour}:${startTimeUtc.minute}`;
      // const revertJobName = `revert_monthly_price_update_${sku}_date_${date}_slot_${endTimeUtc.hour}:${endTimeUtc.minute}`;

      const updateJobName = `monthly_price_update_${sku}_date_${startTimeUtc.date}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_monthly_price_update_${sku}_date_${endTimeUtc.date}_slot_${endHour}:${endMinute}`;
      // Define and schedule the update and revert jobs
      await defineMonthlyJobUtc(sku, startTimeUtc.date,endTimeUtc.date, timeSlot);

      // Schedule the jobs in UTC timezone
      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, date:startTimeUtc.date, scheduleId }, { timezone: 'UTC'});
      console.log(`Scheduled monthly price update for SKU: ${sku} on date ${startTimeUtc.date} at ${timeSlot.startTime} EDT (${startTimeUtc.hour}:${startTimeUtc.minute})`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, date:endTimeUtc.date, scheduleId }, { timezone: 'UTC' });
      console.log(`Scheduled monthly price revert for SKU: ${sku} on date ${endTimeUtc.date} at ${timeSlot.endTime} EDT (${endTimeUtc.hour}:${endTimeUtc.minute})`);
    }
  }
};

/*
const monthlyConvertBSTtoUTCForEDT = (inputTime) => {
  const [hours, minutes] = inputTime.split(':').map(Number);

  // Step 1: Add 6 hours to convert from Bangladesh Standard Time (BST) to EDT
  let edtHours = hours + 6;

  // Handle edge cases where time exceeds 24 hours
  if (edtHours >= 24) {
    edtHours -= 24; // Wrap around if the hours go above 24
  }

  // Step 2: Treat the result as New York time (EDT) and convert it to UTC
  const now = new Date(); // Get today's date
  const edtTime = new Date(now);
  edtTime.setHours(edtHours, minutes, 0, 0);

  // Step 3: Convert EDT time to UTC
  const utcTime = new Date(edtTime.getTime() + (4 * 60 * 60 * 1000)); // EDT is UTC-4, so add 4 hours
  console.log(`Input Time: ${inputTime} BST -> ${edtTime} EDT -> ${utcTime} UTC`);

  return utcTime;
};*/

const monthlyConvertBSTtoUTCForEDT = (inputTime) => {
  // Step 1: Parse the input time from Bangladesh time zone (BST)
  const [hours, minutes] = inputTime.split(':').map(Number);

  // Step 2: Get the current date in Bangladesh (BST)
  const currentDateInBST = moment.tz('Asia/Dhaka').set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0
  });

  // Step 3: Treat the time as if it's in New York time (EDT)
  const edtDateTime = currentDateInBST.tz('America/New_York', true); // Same time, but treat it as New York time

  // Step 4: Convert the New York (EDT) time to UTC
  const utcDateTime = edtDateTime.utc(); // Convert EDT to UTC

  console.log(`Input Time (BST): ${inputTime} -> Treated as EDT: ${edtDateTime.format()} -> Scheduled in UTC: ${utcDateTime.format()}`);

  return utcDateTime.toDate(); // Return the Date object in UTC
};

async function defineMonthlyJob(sku, startDate,endDate, timeSlot) {
  // Convert start and end times from Bangladesh (BST) to UTC for scheduling
  const startTimeInUTC = monthlyConvertBSTtoUTCForEDT(timeSlot.startTime);
  const endTimeInUTC = monthlyConvertBSTtoUTCForEDT(timeSlot.endTime);

  // Get the UTC hours and minutes
  const startHourUTC = startTimeInUTC.getUTCHours();
  const startMinuteUTC = startTimeInUTC.getUTCMinutes();
  const endHourUTC = endTimeInUTC.getUTCHours();
  const endMinuteUTC = endTimeInUTC.getUTCMinutes();

  console.log(`Job Start Time in UTC: ${startHourUTC}:${startMinuteUTC}, End Time in UTC: ${endHourUTC}:${endMinuteUTC}`);

  const updateJobName = `monthly_price_update_${sku}_date_${startDate}_slot_${startHourUTC}:${startMinuteUTC}`;
  const revertJobName = `revert_monthly_price_update_${sku}_date_${endDate}_slot_${endHourUTC}:${endMinuteUTC}`;

  // Define the job in Agenda for price update
  agenda.define(updateJobName, { priority: 10 }, async (job) => {
    const { sku, newPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Price updated for SKU: ${sku} at ${startTimeInUTC} UTC`);
    } catch (error) {
      console.error(`Failed to update price for SKU: ${sku}`, error);
    }
  });

  // Define the job in Agenda for price revert
  agenda.define(revertJobName, { priority: 10 }, async (job) => {
    const { sku, revertPrice } = job.attrs.data;
    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku} at ${endTimeInUTC} UTC`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}`, error);
    }
  });
}

const scheduleMonthlyPriceChange = async (sku, monthlyTimeSlots, scheduleId) => {
  for (const [date, timeSlots] of Object.entries(monthlyTimeSlots)) {
    for (const timeSlot of timeSlots) {
      // Convert start and end times based on user time zone (Bangladesh BST -> EDT -> UTC)
      const startTimeInUTC = monthlyConvertBSTtoUTCForEDT(timeSlot.startTime);
      const endTimeInUTC = monthlyConvertBSTtoUTCForEDT(timeSlot.endTime);
      
      let adjustedStartDate = Number(date);
      let adjustedEndDate = Number(date);

      if(Number(timeSlot.startTime.split(":")[0])>=20){
        adjustedStartDate = (adjustedStartDate + 1)%31;
      }
      if(Number(timeSlot.endTime.split(":")[0])>=20){
        adjustedEndDate =(adjustedEndDate+1)%31;
      }
      // Get the UTC hours and minutes
      const startHourUTC = startTimeInUTC.getUTCHours();
      const startMinuteUTC = startTimeInUTC.getUTCMinutes();
      const endHourUTC = endTimeInUTC.getUTCHours();
      const endMinuteUTC = endTimeInUTC.getUTCMinutes();

      // Cron expressions for specific dates
      const updateCron = `${startMinuteUTC} ${startHourUTC} ${adjustedStartDate} * *`;
      const revertCron = `${endMinuteUTC} ${endHourUTC} ${adjustedEndDate} * *`;

      const updateJobName = `monthly_price_update_${sku}_date_${adjustedStartDate}_slot_${startHourUTC}:${startMinuteUTC}`;
      const revertJobName = `revert_monthly_price_update_${sku}_date_${adjustedEndDate}_slot_${endHourUTC}:${endMinuteUTC}`;
      await defineMonthlyJob(sku, adjustedStartDate,adjustedEndDate, timeSlot);  // Pass timeSlot, not timeSlots

      // Schedule the jobs in UTC (which aligns with EDT)
      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, date:adjustedStartDate, scheduleId }, { timezone: "UTC" });
      console.log(`Scheduled monthly price update for SKU: ${sku} on date ${adjustedStartDate} at ${startHourUTC}:${startMinuteUTC} UTC`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, date:adjustedEndDate, scheduleId }, { timezone: "UTC" });
      console.log(`Scheduled monthly price revert for SKU: ${sku} on date ${adjustedEndDate} at ${endHourUTC}:${endMinuteUTC} UTC`);
    }
  }
};

// Weekly job scheduling remains the same as provided before



/*
agenda.define('schedule price update', async (job) => {
  const { sku, newPrice } = job.attrs.data;
  await updateProductPrice(sku, newPrice);
  console.log(`Price updated for SKU: ${sku} to ${newPrice}`);
});


agenda.define('revert price update', async (job) => {
  const { sku, originalPrice } = job.attrs.data;
  await updateProductPrice(sku, originalPrice);
  console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
});*/
/*
const singleDayScheduleChange = async (sku, newPrice, originalPrice, startDate, endDate, scheduleId) => {
  try {
    // Ensure startDate and endDate are valid Date objects
    const validStartDate = new Date(startDate);
    const validEndDate = endDate ? new Date(endDate) : null;
    const timeSlotScheduleId = new mongoose.Types.ObjectId();
    // Validate the dates
    if (isNaN(validStartDate.getTime()) || (validEndDate && isNaN(validEndDate.getTime()))) {
      throw new Error('Invalid start or end date');
    }

    // Define and schedule the price update job at the start date
    const updateJobName = `schedule_price_update_${sku}_${validStartDate.toISOString()}`;
   

    agenda.define(updateJobName,{ priority: 1 }, async (job) => {
      const { sku, newPrice, scheduleId } = job.attrs.data;
      try {
        await updateProductPrice(sku, newPrice);
     
      } catch (error) {
        console.error(`Failed to update price for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
      }
    });

    await agenda.schedule(validStartDate.toISOString(), updateJobName, { sku, newPrice, scheduleId });
    console.log(`Scheduled price update for SKU: ${sku} at ${validStartDate} to ${newPrice} (Schedule ID: ${scheduleId})`);

    // Define and schedule the price revert job at the end date (if provided)
    if (validEndDate) {
      const revertJobName = `revert_price_update_${sku}_${validEndDate.toISOString()}`;

      agenda.define(revertJobName,{ priority: 1 }, async (job) => {
        const { sku, originalPrice, scheduleId } = job.attrs.data;
        try {
          await updateProductPrice(sku, originalPrice);
          console.log(`Price reverted for SKU: ${sku} to ${originalPrice} (Schedule ID: ${scheduleId})`);
        } catch (error) {
          console.error(`Failed to revert price for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
        }
      });

      await agenda.schedule(validEndDate.toISOString(), revertJobName, { sku, originalPrice, scheduleId });
      console.log(`Scheduled price revert for SKU: ${sku} at ${validEndDate} to ${originalPrice} (Schedule ID: ${scheduleId})`);
    }

  } catch (error) {
    console.error(`Error scheduling price changes for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
  }
};
*/

// const singleConvertBSTtoUTCForEDT = (inputDateTime) => {
//   // Step 1: Parse the input time in Bangladesh Standard Time (BST)
//   const bstTime = moment.tz(inputDateTime, "Asia/Dhaka"); // This represents BST (UTC+6)

//   // Step 2: Convert this BST time to EDT (America/New_York timezone)
//   const edtTime = bstTime.clone().tz("America/New_York"); // This keeps the same clock time but in EDT

//   // Step 3: Convert EDT time to UTC
//   const utcTime = edtTime.clone().utc(); // Convert the EDT time to UTC for scheduling

//   console.log(`Input Time: ${bstTime.format('YYYY-MM-DD HH:mm:ss')} BST -> ${edtTime.format('YYYY-MM-DD HH:mm:ss')} EDT -> ${utcTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);
  
//   return utcTime.toDate(); // Return the UTC Date object for job scheduling
// };
/*
const singleConvertBSTtoUTCForEDT = (inputDateTime) => {
  // Step 1: Convert the input time (BST) to EDT
  const bstToEdtOffset = -10; // Bangladesh is UTC+6, EDT is UTC-4, so we subtract 10 hours
  const edtDateTime = new Date(inputDateTime.getTime() + bstToEdtOffset * 60 * 60 * 1000);
  
  // Step 2: Adjust time for UTC (no additional offset needed since EDT aligns with UTC)
  const finalUtcDateTime = edtDateTime;

  console.log(`Input Time: ${inputDateTime} BST -> ${edtDateTime} EDT -> ${finalUtcDateTime} UTC`);
  
  return finalUtcDateTime;
}*/
const singleConvertBSTtoUTCForEDT = (inputDateTime) => {
  // Step 1: Treat the inputDateTime (BST) as if it were EDT (New York Time)
  const edtDateTime = moment.tz(inputDateTime, 'Asia/Dhaka').tz('America/New_York', true); // Treat the input as EDT
  
  // Step 2: Convert the EDT time to UTC for job scheduling
  const utcDateTime = edtDateTime.clone().utc(); // Convert EDT time to UTC
  
  console.log(`Input Time (BST): ${inputDateTime} -> Treated as EDT: ${edtDateTime.format()} -> Scheduled in UTC: ${utcDateTime.format()}`);
  
  return utcDateTime.toDate(); // Return the Date object in UTC
}





const singleDayScheduleChange = async (sku, newPrice, originalPrice, startDate, endDate, scheduleId, userTimeZone = '') => {
  console.log("User Time Zone:", userTimeZone);
  try {
    // Ensure startDate and endDate are valid Date objects
    const validStartDate = new Date(startDate);
    const validEndDate = endDate ? new Date(endDate) : null;

    if (isNaN(validStartDate.getTime()) || (validEndDate && isNaN(validEndDate.getTime()))) {
      throw new Error('Invalid start or end date');
    }

    let adjustedStartDate = validStartDate;
    let adjustedEndDate = validEndDate;

    // Convert BST to EDT if the user is in Bangladesh time zone
    if (userTimeZone === 'Asia/Dhaka') {
      adjustedStartDate = singleConvertBSTtoUTCForEDT(validStartDate);  // Convert the start time
      adjustedEndDate = validEndDate ? singleConvertBSTtoUTCForEDT(validEndDate) : null; // Convert the end time if provided
    }

    // Define and schedule the price update job at the start date
    const updateJobName = `schedule_price_update_${sku}_${adjustedStartDate.toISOString()}`;
   
    agenda.define(updateJobName, { priority: 1 }, async (job) => {
      const { sku, newPrice, scheduleId } = job.attrs.data;
      try {
        await updateProductPrice(sku, newPrice);
        console.log(`Price updated for SKU: ${sku} (Schedule ID: ${scheduleId})`);
      } catch (error) {
        console.error(`Failed to update price for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
      }
    });

    await agenda.schedule(adjustedStartDate.toISOString(), updateJobName, { sku, newPrice, scheduleId });
    console.log(`Scheduled price update for SKU: ${sku} at ${adjustedStartDate} to ${newPrice} (Schedule ID: ${scheduleId})`);

    // Define and schedule the price revert job at the end date (if provided)
    if (adjustedEndDate) {
      const revertJobName = `revert_price_update_${sku}_${adjustedEndDate.toISOString()}`;

      agenda.define(revertJobName, { priority: 1 }, async (job) => {
        const { sku, originalPrice, scheduleId } = job.attrs.data;
        try {
          await updateProductPrice(sku, originalPrice);
          console.log(`Price reverted for SKU: ${sku} to ${originalPrice} (Schedule ID: ${scheduleId})`);
        } catch (error) {
          console.error(`Failed to revert price for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
        }
      });

      await agenda.schedule(adjustedEndDate.toISOString(), revertJobName, { sku, originalPrice, scheduleId });
      console.log(`Scheduled price revert for SKU: ${sku} at ${adjustedEndDate} to ${originalPrice} (Schedule ID: ${scheduleId})`);
    }

  } catch (error) {
    console.error(`Error scheduling price changes for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
  }
};



const singleDaySchedulePriceChange = async (sku, singleDaySlots, parentScheduleId) => {
  try {
    for (const slot of singleDaySlots) {
      const { startDate, endDate, newPrice, revertPrice, 
        singleDayScheduleId } = slot;
     
      const validStartDate = new Date(startDate);
      const validEndDate = endDate ? new Date(endDate) : null;

      if (isNaN(validStartDate.getTime()) || (validEndDate && isNaN(validEndDate.getTime()))) {
        throw new Error('Invalid start or end date');
      }

      const updateJobName = `schedule_price_update_${sku}_${validStartDate.toISOString()}`;

      agenda.define(updateJobName, async (job) => {
        const { sku, newPrice, parentScheduleId, singleDayScheduleId } = job.attrs.data;
        try {
          await updateProductPrice(sku, newPrice);
        } catch (error) {
          console.error(`Failed to update price for SKU: ${sku} (Single Day Schedule ID: ${singleDayScheduleId})`, error);
        }
      });

      await agenda.schedule(validStartDate.toISOString(), updateJobName, { sku, newPrice, parentScheduleId, singleDayScheduleId });
      console.log(`Scheduled price update for SKU: ${sku} at ${validStartDate} to ${newPrice} (Single Day Schedule ID: ${singleDayScheduleId})`);

      if (validEndDate) {
        const revertJobName = `revert_price_update_${sku}_${validEndDate.toISOString()}`;

        agenda.define(revertJobName, async (job) => {
          const { sku, originalPrice, singleDayScheduleId } = job.attrs.data;
          try {
            await updateProductPrice(sku, revertPrice || originalPrice);
            console.log(`Price reverted for SKU: ${sku} to ${revertPrice || originalPrice} (Single Day Schedule ID: ${singleDayScheduleId})`);
          } catch (error) {
            console.error(`Failed to revert price for SKU: ${sku} (Single Day Schedule ID: ${singleDayScheduleId})`, error);
          }
        });

        await agenda.schedule(validEndDate.toISOString(), revertJobName, { sku, originalPrice: revertPrice || originalPrice, parentScheduleId, singleDayScheduleId });
        console.log(`Scheduled price revert for SKU: ${sku} at ${validEndDate} to ${revertPrice || originalPrice} (Single Day Schedule ID: ${singleDayScheduleId})`);
      }

      // Update the slot with the unique singleDayScheduleId
      slot.singleDayScheduleId = singleDayScheduleId;
    }

    // Update the parent schedule with the modified singleDaySlots
    await PriceSchedule.updateOne({ _id: parentScheduleId }, { $set: { singleDaySlots } });

  } catch (error) {
    console.error(`Error scheduling price changes for SKU: ${sku} (Parent Schedule ID: ${parentScheduleId})`, error);
  }
};



(async function () {
  await agenda.start();
})();


app.post('/api/schedule/change', async (req, res) => {
  // const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate } = req.body;
  const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots,timeZone} = req.body;
  console.log("Request body:", JSON.stringify(req.body, null, 2));

console.log("hit on post:"+weekly+weeklyTimeSlots+userName);

  try {
    
    // Create a new schedule and save it to the database
    // const newSchedule = new PriceSchedule(req.body);
    const newSchedule = new PriceSchedule({
      userName,
      asin,
      sku,
      title,
      price,
      currentPrice,
      imageURL,
      startDate,
      endDate,
      weekly,
      weeklyTimeSlots,
      monthly,
      monthlyTimeSlots,
      timeZone
    });
    await newSchedule.save();

   
    // await newSchedule.save();

    // Log the creation of the schedule to history
    const historyLog = new History({
      scheduleId: newSchedule._id,
      action: 'created',
      userName,
      asin,
      sku,
      title,
      price,
      currentPrice,
      imageURL,
      startDate,
      endDate,
      weekly,
      weeklyTimeSlots,
      monthly,
      monthlyTimeSlots,
    
      timestamp: new Date(),
    });
    await historyLog.save();
    // Handle weekly scheduling
    // if (weekly && daysOfWeek && daysOfWeek.length > 0) {

    //   console.log(sku+daysOfWeek+startTime+endTime);
    //   await scheduleWeeklyPriceChange(sku, price, currentPrice, daysOfWeek,startTime,endTime);
    // }

    console.log("new schedule id"+newSchedule._id)
    if (timeZone !=="America/New_York" && weekly && Object.keys(weeklyTimeSlots).length > 0) {
      console.log("slots: "+JSON.stringify(weeklyTimeSlots));
      await scheduleWeeklyPriceChange(sku, weeklyTimeSlots,newSchedule._id,timeZone);
    }
    if (timeZone ==="America/New_York" && weekly && Object.keys(weeklyTimeSlots).length > 0) {
      console.log("slots from new work: "+JSON.stringify(weeklyTimeSlots));
      await scheduleWeeklyPriceChangeFromEdt(sku, weeklyTimeSlots,newSchedule._id);
    }

    // if (monthly && datesOfMonth && datesOfMonth.length > 0) {
    //   console.log(sku+datesOfMonth+startTime+endTime);
    //   await scheduleMonthlyPriceChange(sku, price, currentPrice, datesOfMonth,startTime,endTime);
    // }
    if (timeZone !=="America/New_York" && monthly && Object.keys(monthlyTimeSlots).length > 0) {
      console.log("slots: "+JSON.stringify(monthlyTimeSlots));
      await scheduleMonthlyPriceChange(sku, monthlyTimeSlots,newSchedule._id,timeZone);
    }
    if (timeZone ==="America/New_York" && monthly && Object.keys(monthlyTimeSlots).length > 0) {
      console.log("slots from new work: "+JSON.stringify(monthlyTimeSlots));
      await scheduleMonthlyPriceChangeFromEdt(sku, monthlyTimeSlots,newSchedule._id);
    }
    // if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
    //   console.log("Monthly slots:", JSON.stringify(monthlyTimeSlots, null, 2));
    //   await scheduleMonthlyPriceChange(sku, monthlyTimeSlots,newSchedule._id);
    // }


    // Handle one-time scheduling
    // if (!weekly && !monthly) {
    //   await agenda.schedule(new Date(startDate), 'schedule price update', {asin, sku, newPrice: price });

    //   if (endDate) {
    //     await agenda.schedule(new Date(endDate), 'revert price update', {asin, sku, originalPrice: currentPrice });
    //   }
    // }

    if (!weekly && !monthly) {
      // Instead of scheduling separate tasks, call singleDayScheduleChange
      console.log("zone: "+timeZone)
      await singleDayScheduleChange(sku, price, currentPrice, startDate, endDate,newSchedule._id,timeZone);
    }
    

   

    // Send the response after all operations are completed
    res.json({ success: true, message: 'Schedule saved and jobs queued successfully.', schedule: newSchedule._id });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});


app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots,timeZone } = req.body;

  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("req for update by"+id)
  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Cancel existing jobs
   
    // Log the previous state of the schedule before updating
    const previousState = {
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      price: schedule.price,
      currentPrice: schedule.currentPrice,
      status: schedule.status,
      title: schedule.title,
      asin: schedule.asin,
      sku: schedule.sku,
      imageURL: schedule.imageURL,
      weekly: schedule.weekly,
      weeklyTimeSlots: schedule.weeklyTimeSlots,
      monthly: schedule.monthly,
      monthlyTimeSlots: schedule.monthlyTimeSlots,
    };

    // Update the schedule with new details
    schedule.startDate = startDate;
    schedule.endDate = endDate;
    schedule.price = price;
    schedule.currentPrice = currentPrice;
    schedule.status = 'updated';
    schedule.title = title || schedule.title;
    schedule.asin = asin || schedule.asin;
    schedule.sku = sku || schedule.sku;
    schedule.imageURL = imageURL || schedule.imageURL;
    schedule.weekly = weekly || false;
    schedule.weeklyTimeSlots = weeklyTimeSlots || [];
    schedule.monthly = monthly || false;
    schedule.monthlyTimeSlots = monthlyTimeSlots || [];

    await schedule.save();

    // Log the update in history with previous and updated states
    const historyLog = new History({
      scheduleId: schedule._id,
      action: 'updated',
      previousState,
      updatedState: {
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        price: schedule.price,
        currentPrice: schedule.currentPrice,
        status: schedule.status,
        title: schedule.title,
        asin: schedule.asin,
        sku: schedule.sku,
        imageURL: schedule.imageURL,
        weekly: schedule.weekly,
        weeklyTimeSlots: schedule.weeklyTimeSlots,
        monthly: schedule.monthly,
        monthlyTimeSlots: schedule.monthlyTimeSlots,
      },
      userName,
      timestamp: new Date(),
    });
    await historyLog.save();

    // Unified job cancellation logic for both weekly and monthly time slot
    const scheduleId = schedule._id;
    console.log("schedulId:"+scheduleId)
    await agenda.cancel({ 'data.scheduleId': schedule._id });

    
    // Reschedule weekly jobs
    if (timeZone !=="America/New_York" && weekly && Object.keys(weeklyTimeSlots).length > 0) {
      console.log("slots: "+JSON.stringify(weeklyTimeSlots));
      await scheduleWeeklyPriceChange(sku, weeklyTimeSlots,schedule._id,timeZone);
    }
    if (timeZone ==="America/New_York" && weekly && Object.keys(weeklyTimeSlots).length > 0) {
      console.log("slots from new work: "+JSON.stringify(weeklyTimeSlots));
      await scheduleWeeklyPriceChangeFromEdt(sku, weeklyTimeSlots,schedule._id);
    }
    // Reschedule monthly jobs
    // if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
    //   await scheduleMonthlyPriceChange(sku, monthlyTimeSlots, schedule._id);
    // }
    if (timeZone !=="America/New_York" && monthly && Object.keys(monthlyTimeSlots).length > 0) {
      console.log("slots: "+JSON.stringify(monthlyTimeSlots));
      await scheduleMonthlyPriceChange(sku, monthlyTimeSlots,schedule._id,timeZone);
    }
    if (timeZone ==="America/New_York" && monthly && Object.keys(monthlyTimeSlots).length > 0) {
      console.log("slots from new work: "+JSON.stringify(monthlyTimeSlots));
      await scheduleMonthlyPriceChangeFromEdt(sku, monthlyTimeSlots,schedule._id);
    }
    // If no weekly or monthly schedules, handle single-day schedules
    if (!weekly && !monthly) {
      await agenda.cancel({ 'data.scheduleId': schedule._id });
      await singleDayScheduleChange(sku, price, currentPrice, startDate, endDate, schedule._id);
    }

    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});



app.delete('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the schedule by ID
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Log the deletion action and previous state in history
    const historyLog = new History({
      scheduleId: schedule._id,
      action: 'deleted',
      userName: schedule.userName,
      asin: schedule.asin,
      sku: schedule.sku,
      title: schedule.title,
      price: schedule.price,
      currentPrice: schedule.currentPrice,
      imageURL: schedule.imageURL,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      weekly: schedule.weekly,
      weeklyTimeSlots: schedule.weeklyTimeSlots,
      monthly: schedule.monthly,
      monthlyTimeSlots: schedule.monthlyTimeSlots,
     
      previousState: { ...schedule.toObject() },
      timestamp: new Date(),
    });
    await historyLog.save();

    // Mark the schedule as deleted (soft delete)
    schedule.status = 'deleted';
    await schedule.save();

    // Cancel any associated jobs
    // await agenda.cancel({ 'data.sku': schedule.sku });
    await agenda.cancel({ 'data.scheduleId': schedule._id}); // Ensure each job is associated with a unique scheduleId


    res.json({ success: true, message: 'Schedule marked as deleted and associated jobs canceled.' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Fetch Access Token function
const fetchAccessToken = async () => {
  try {
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: credentials.lwa_app_id,
      client_secret: credentials.lwa_client_secret,
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const fetchProductPricing = async (asin) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/products/pricing/v0/price`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: {
      MarketplaceId: 'ATVPDKIKX0DER',
      Asins: asin,
      ItemType: 'Asin',
    },
  };

  console.log('Fetching product pricing with ASIN:', asin);

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('Error fetching product pricing:', error.response ? error.response.data : error.message);
    throw error;
  }
};



// Function to fetch product details from Amazon SP-API
const fetchProductDetails = async (asin) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/catalog/v0/items/${asin}`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    params: {
      MarketplaceId: credentials.marketplace_id,
    },
    timeout: 10000,
  };

  const response = await axios(request);
  return response.data;
};


// Schedule the task to run every day at 8:00 am Bangladesh time
cron.schedule('0 8 * * *', async () => {
  const bangladeshTime = moment.tz("Asia/Dhaka").format();
  console.log(`Cron job started at Bangladesh Time: ${bangladeshTime}`);
  await fetchAndDownloadDataOnce();
}, {
  timezone: "Asia/Dhaka"
});

// Adjusted to run at 8:30 AM Bangladesh time
cron.schedule('30 8 * * *', async () => {
  try {
    console.log('Scheduled task started at 8:30 am Bangladesh time...');

    // Step 1: Fetch all listings from MongoDB
    const listings = await Inventory.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);

    // Step 2: Merge listings with image URLs and save to the MergedImage collection
    const result = await mergeAndSaveImageData(listings);
    console.log(result);
  } catch (error) {
    console.error('Error during scheduled task:', error);
  }
}, {
  timezone: 'Asia/Dhaka', // Set the timezone to Bangladesh time
});

/*
// Schedule a cron job to run the fetch and merge task every day at 3:00 PM Bangladesh time
cron.schedule('0 16 * * *', async () => {
  console.log('Scheduled task started at 3:00 PM Bangladesh time...');
  
  try {
    const listings = await MergedProduct.find();
    const inventorySummaries = await fetchInventorySummaries();
    await mergeAndSaveFbmData(listings, inventorySummaries);
    console.log('Data fetching, merging, and saving completed.');
  } catch (error) {
    console.error('Error during scheduled task:', error);
  }
}, {
  timezone: 'Asia/Dhaka', // Set the timezone to Bangladesh (UTC+6)
});*/

// cron.schedule('0 * * * *', async () => {
//   console.log('Scheduled task started...');

//   try {
//     const listings = await MergedProduct.find();
//     const inventorySummaries = await fetchInventorySummaries();
//     await mergeAndSaveFbmData(listings, inventorySummaries);
//     console.log('Data fetching, merging, and saving completed.');
//   } catch (error) {
//     console.error('Error during scheduled task:', error);
//   }
// });

cron.schedule('0 11 * * *', async () => { // Adjusted to run at 10:00 AM Bangladesh time
  console.log('Scheduled task started (11:00 AM Bangladesh time)...');
  
  try {
    // Call your API endpoint
    const response = await axios.get('https://api.priceobo.com/fetch-and-merge');
    console.log('API response:', response.data);
  } catch (error) {
    console.error('Error during cron job:', error);
  }
}, {
  timezone: 'Asia/Dhaka' // Set the timezone to Bangladesh (UTC+6)
});


// Schedule the cron job for 10:30 AM Bangladesh Time (BST)
cron.schedule('30 11 * * *', async () => {
  try {
    // Call the endpoint or directly invoke the function
    console.log('Running scheduled task to fetch and merge sales data.');
    const response = await axios.get('https://api.priceobo.com/fetch-and-merge-sales');
    // const response = await axios.get('http://localhost:3000/fetch-and-merge-sales');

    console.log('Scheduled task completed:', response.data);
  } catch (error) {
    console.error('Error in scheduled task:', error);
  }
}, {
  timezone: 'Asia/Dhaka'
});




app.get('/fetch-and-merge', async (req, res) => {
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
    console.error('Error during data processing:', error);
    res.status(500).json({ error: 'Failed to fetch, merge, and store data' });
  }
});

app.get('/fetch-and-merge-images', async (req, res) => {
  try {
    const listings = await Inventory.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeAndSaveImageData(listings);
    res.json({ message: 'Data merged and saved successfully.', result: mergedData });
  } catch (error) {
    console.error('Error during manual data processing:', error);
    res.status(500).json({ error: 'Failed to fetch, merge, and save data' });
  }
});
app.get('/fetch-and-merge-sales', async (req, res) => {
  try {
    const listings = await Stock.find();
    console.log(`Fetched ${listings.length} listings from MongoDB.`);
    const mergedData = await mergeAndSaveSalesData(listings);
    res.json({ message: 'Data merged and saved successfully.', result: mergedData });
  } catch (error) {
    console.error('Error during manual data processing:', error);
    res.status(500).json({ error: 'Failed to fetch, merge, and save data' });
  }
});
// fetch image
app.get('/image/:sku', async (req, res) => {
  // const { sku } = req.params;
  const sku = decodeURIComponent(req.params.sku);
  console.log("sku:"+sku);
  try {
    const listingData = await getListingsItem(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product price' });
  }
});

app.get('/list/:sku',async(req,res)=>{
  const { sku } = req.params;

  try {
    const listingData = await getListingsItemBySku(sku);
    res.json(listingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing item' });
  }
})


// fetch product using asin
app.get('/product/:asin', async (req, res) => {
  const { asin } = req.params;
  try {
    const productPricing = await fetchProductPricing(asin);
    res.json(productPricing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product pricing' });
  }
});


// Express.js route to fetch product details
app.get('/details/:asin', async (req, res) => {
  const { asin } = req.params;
  try {
    const productDetails = await fetchProductDetails(asin);
    res.json(productDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});


app.get('/api/history/sku/:sku', async(req,res)=>{
  const {sku} = req.params;
  console.log(sku)

  try {
    
    const result = await History.find({sku:sku});
    res.json(result);
  }  catch (error) {
    res.status(400).json({
      status: "Fail",
      message: "Couldn't fetch data.",
      error: error.message
  });
  }
})

app.get('/sales-metrics-by-sku/:sku', async (req, res) => {
  // const { sku } = req.params;
  const sku = decodeURIComponent(req.params.sku);
  console.log("sku"+sku)
  try {
    const results = await getMetricsForTimeRanges(sku);
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales metrics' });
  }
});
// Route to fetch the last 30 days of sales metrics
app.get('/sales-metrics/day/:sku', async (req, res) => {
  const { sku } = req.params;

  try {
    const metrics = await fetchSalesMetricsByDay(sku);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales metrics' });
  }
});

app.get('/api/history/:scheduleId', async (req, res) => {
  const { scheduleId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    return res.status(400).json({ error: 'Invalid scheduleId format' });
  }

  try {
    const history = await History.find({ scheduleId: new mongoose.Types.ObjectId(scheduleId) }).sort({ createdAt: -1 });

    if (!history || history.length === 0) {
      return res.status(404).json({ message: 'No history found for this scheduleId' });
    }

    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
app.get('/api/history/', async (req, res) => {
  
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
      error: error.message
  });
  }
});

app.get('/fetch-all-listings', async (req, res) => {
  try {
    // const listings = await Inventory.find(); 
    const listings = await SaleStock.find();
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all listings' });
  }
});

app.get('/api/jobs', async (req, res) => {
  // const { sku } = req.params;
  // console.log('Requested scheduleId:', sku);
  
  try {
    // Make sure scheduleId is a string
    const jobs = await agenda._collection.find().toArray();
    
    if (jobs.length === 0) {
      console.log('No jobs found for sku:', sku);
    }
    
    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Error fetching jobs by scheduleId:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});



app.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;


  try {
    // Call the sendEmail function
    await sendEmail(to, subject, text, html);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email');
  }
});


app.get('/', (req, res) => {
  res.send('Server is running!');
});

// const PORT = 3000;
app.listen(process.env.PORT,'0.0.0.0', () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

const scheduleRoute = require("./src/route/Schedule");
const authRoute = require("./src/route/auth");
const userRoute = require("./src/route/user");
const historyRoute = require("./src/route/history")
const accountRoute = require("./src/route/account")
const PriceSchedule = require('./src/model/PriceSchedule');
const History = require('./src/model/HistorySchedule');

const sendEmail = require('./src/service/EmailService');
// const Listing = require('./src/model/Listing');
const Product = require("./src/model/Product");
const Inventory = require("./src/model/Inventory");
const MergedProduct = require('./src/model/MergedImage');

const { fetchAndDownloadDataOnce } = require('./src/service/inventoryService');
const { getListingsItem } = require('./src/service/ImageService');
const { mergeAndSaveImageData } = require('./src/merge-service/imageMergedService');
const { fetchInventorySummaries, mergeAndSaveFbmData } = require('./src/merge-service/fbmMergedService');
const Stock = require('./src/model/Stock');
const { getListingsItemBySku } = require('./src/service/getPriceService');
const { getMetricsForTimeRanges } = require('./src/service/getSaleService');
const { mergeAndSaveSalesData } = require('./src/merge-service/saleUnitMergedService');
const SaleStock = require('./src/model/SaleStock');
const fetchSalesMetricsByDay = require('./src/service/getReportService');


app.use("/api/schedule", scheduleRoute);
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/histories",historyRoute);
app.use("/api/account",accountRoute);
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});
