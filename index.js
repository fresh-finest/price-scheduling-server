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


// const MONGO_URI = process.env.MONGO_URI;

const MONGO_URI = "mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/dps?retryWrites=true&w=majority&appName=ppc-db";


mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB!`.green.bold);
  })
  .catch((err) => {
    console.log(err);
  });


const agenda = new Agenda({ db: { address: MONGO_URI, collection: 'jobs' } });


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

async function defineWeeklyJob(sku, day, timeSlot) {
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

const scheduleWeeklyPriceChange = async (sku, weeklyTimeSlots,scheduleId) => {
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
      await defineWeeklyJob(sku, day, timeSlot);  // Pass timeSlot, not timeSlots

      await agenda.every(updateCron, updateJobName, { sku, newPrice:timeSlot.newPrice,day,scheduleId});
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${timeSlot.startTime}`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice:timeSlot.revertPrice, day,scheduleId});
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${timeSlot.endTime}`);
    }
  }
};
*/
// Helper function to convert user time to EDT
const getTimeInEDT = (inputTime, userTimeZoneOffset, targetTimeZoneOffset = -4) => {
  const [hours, minutes] = inputTime.split(':').map(Number);

  // Convert user time to UTC
  let utcHours = hours - userTimeZoneOffset;
  if (utcHours < 0) utcHours += 24;
  if (utcHours >= 24) utcHours -= 24;

  // Convert UTC to EDT
  let edtHours = utcHours + targetTimeZoneOffset;
  if (edtHours < 0) edtHours += 24;
  if (edtHours >= 24) edtHours -= 24;

  // Return the adjusted time in EDT format (HH:mm)
  return `${String(edtHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Define the weekly job with the corrected time in EDT
async function defineWeeklyJob(sku, day, timeSlot) {
  console.log("TimeSlot:", JSON.stringify(timeSlot.startTime));

  const jobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.startTime}`;
  console.log(jobName);
  const revertJobName = `weekly_price_update_${sku}_day_${day}_slot_${timeSlot.endTime}`; // Ensure unique job name for each time slot

  agenda.define(jobName, { priority: 5 }, async (job) => {
    const { sku, newPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}, day: ${day}, slot: ${timeSlot.startTime}`);
    } catch (error) {
      console.error(`Failed to apply weekly price update for SKU: ${sku}, day: ${day}, slot: ${timeSlot.startTime}`, error);
    }
  });

  agenda.define(`revert_${revertJobName}`, { priority: 5 }, async (job) => {
    const { sku, revertPrice } = job.attrs.data;

    try {
      await updateProductPrice(sku, revertPrice);
      console.log(`Price reverted for SKU: ${sku}, revert price: ${revertPrice}, day: ${day}, slot: ${timeSlot.endTime}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}, day: ${day}, slot: ${timeSlot.endTime}`, error);
    }
  });
}

// Helper function to adjust time by reducing 12 hours (for fixing PM issues)
const reduce12Hours = (hours) => {
  let adjustedHours = hours + 12;
  if (adjustedHours < 0) adjustedHours += 24; // Handle negative hours by wrapping around
  return adjustedHours;
};

// Schedule the weekly price change
const scheduleWeeklyPriceChange = async (sku, weeklyTimeSlots, scheduleId) => {
  const userTimeZoneOffset = 6; // Assume Bangladesh UTC+6
  const edtOffset = -4; // EDT is UTC-4 during daylight savings

  for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
    for (const timeSlot of timeSlots) {  
      // Convert start and end times from the user's time zone to EDT
      const startTimeInEDT = getTimeInEDT(timeSlot.startTime, userTimeZoneOffset, edtOffset);
      const endTimeInEDT = getTimeInEDT(timeSlot.endTime, userTimeZoneOffset, edtOffset);

      let [startHour, startMinute] = startTimeInEDT.split(':').map(Number);
      let [endHour, endMinute] = endTimeInEDT.split(':').map(Number);

      // Reduce the time by 12 hours
      startHour = reduce12Hours(startHour);
      endHour = reduce12Hours(endHour);

      // Cron expressions after reducing 12 hours
      const updateCron = `${startMinute} ${startHour} * * ${day}`;  // e.g., "15 15 * * 5"
      const revertCron = `${endMinute} ${endHour} * * ${day}`;  // e.g., "45 15 * * 5"

      const updateJobName = `weekly_price_update_${sku}_day_${day}_slot_${startHour}:${startMinute}`;
      const revertJobName = `revert_weekly_price_update_${sku}_day_${day}_slot_${endHour}:${endMinute}`;

      // Schedule the jobs in EDT
      await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, day, scheduleId }, { timezone: "America/New_York" });
      console.log(`Scheduled weekly price update for SKU: ${sku} on day ${day} at ${startTimeInEDT} EDT (reduced by 12 hours)`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, day, scheduleId }, { timezone: "America/New_York" });
      console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${day} at ${endTimeInEDT} EDT (reduced by 12 hours)`);
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

async function defineMonthlyJob(sku, date, timeSlot) {
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

const scheduleMonthlyPriceChange = async (sku, monthlySlots, scheduleId) => {
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
      await defineMonthlyJob(sku, date, timeSlot);  // Pass timeSlot, not timeSlots

      await agenda.every(updateCron, updateJobName, { sku, newPrice:timeSlot.newPrice, date,scheduleId}, { priority: 10 });
      console.log(`Scheduled monthly price update for SKU: ${sku} on date ${date} at ${timeSlot.startTime}`);

      await agenda.every(revertCron, revertJobName, { sku, revertPrice:timeSlot.revertPrice, date,scheduleId}, { priority: 10 });
      console.log(`Scheduled monthly price revert for SKU: ${sku} on date ${date} at ${timeSlot.endTime}`);
    }
  }
};




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
  const { userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots} = req.body;
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
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      console.log("slots: "+JSON.stringify(weeklyTimeSlots));
      await scheduleWeeklyPriceChange(sku, weeklyTimeSlots,newSchedule._id);
    }

    // if (monthly && datesOfMonth && datesOfMonth.length > 0) {
    //   console.log(sku+datesOfMonth+startTime+endTime);
    //   await scheduleMonthlyPriceChange(sku, price, currentPrice, datesOfMonth,startTime,endTime);
    // }

    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      console.log("Monthly slots:", JSON.stringify(monthlyTimeSlots, null, 2));
      await scheduleMonthlyPriceChange(sku, monthlyTimeSlots,newSchedule._id);
    }


    // Handle one-time scheduling
    // if (!weekly && !monthly) {
    //   await agenda.schedule(new Date(startDate), 'schedule price update', {asin, sku, newPrice: price });

    //   if (endDate) {
    //     await agenda.schedule(new Date(endDate), 'revert price update', {asin, sku, originalPrice: currentPrice });
    //   }
    // }

    if (!weekly && !monthly) {
      // Instead of scheduling separate tasks, call singleDayScheduleChange
      await singleDayScheduleChange(sku, price, currentPrice, startDate, endDate,newSchedule._id );
    }
    

   

    // Send the response after all operations are completed
    res.json({ success: true, message: 'Schedule saved and jobs queued successfully.', schedule: newSchedule._id });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});



/*
app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL,weekly,weeklyTimeSlots, monthly, monthlyTimeSlots} = req.body;

  
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

     // Cancel existing jobs
     const weeklySlotsWithIds = {};
     const monthlySlotsWithIds = {};
     for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
       weeklySlotsWithIds[day] = timeSlots.map(slot => ({
         ...slot,
         timeSlotScheduleId:slot.timeSlotScheduleId || new mongoose.Types.ObjectId(), // Generate unique ObjectId here
       }));
     }
 
     // Add a unique ObjectId for each time slot in monthly schedules
     for (const [date, timeSlots] of Object.entries(monthlyTimeSlots)) {
       monthlySlotsWithIds[date] = timeSlots.map(slot => ({
         ...slot,
         timeSlotScheduleId:  slot.timeSlotScheduleId  || new mongoose.Types.ObjectId(), // Generate unique ObjectId here
       }));
     }

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
      monthly:schedule.monthly,
      monthlyTimeSlots: schedule.monthlyTimeSlots
    };

    // Update the schedule with new details
    schedule.startDate = startDate;
    schedule.endDate = endDate;
    schedule.price = price;
    schedule.currentPrice = currentPrice;
    schedule.status = 'updated';
    schedule.title = title || schedule.title; // Ensure title is preserved if not updated
    schedule.asin = asin || schedule.asin; // Ensure ASIN is preserved if not updated
    schedule.sku = sku || schedule.sku; // Ensure SKU is preserved if not updated
    schedule.imageURL = imageURL || schedule.imageURL; // Ensure imageURL is preserved if not updated
    schedule.weekly = weekly || false;
    schedule.weeklyTimeSlots = weeklySlotsWithIds;
    schedule.monthly = monthly || false;
    schedule.monthlySlots =monthlySlotsWithIds;
    
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
        imageURL: schedule.imageURL,
        weekly: schedule.weekly,
        weeklyTimeSlots: schedule.weeklyTimeSlots,
        monthly: schedule.monthly,
        monthlyTimeSlots: schedule.monthlyTimeSlots,
      
      },
      userName, // Track the user who made the update
      timestamp: new Date(),
    });
    await historyLog.save();
    
   
    // Cancel existing jobs
    // console.log("schedule id:"+schedule._id)
    // await agenda.cancel({ 'data.sku': schedule.sku });
    console.log("schedule id: "+schedule._id);
   
    // Re schedule
    
    // Cancel existing jobs only for the updated time slots
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
        for (const timeSlot of timeSlots) {
          // Cancel the existing job for the specific timeSlotScheduleId
          await agenda.cancel({ 'data.timeSlotScheduleId': timeSlot.timeSlotScheduleId });
        }
      }
    }

    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      for (const [date, timeSlots] of Object.entries(monthlyTimeSlots)) {
        for (const timeSlot of timeSlots) {
          // Cancel the existing job for the specific timeSlotScheduleId
          await agenda.cancel({ 'data.timeSlotScheduleId': timeSlot.timeSlotScheduleId });
        }
      }
    }
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      // await agenda.cancel({ 'data.sku': schedule.sku });
    
      await scheduleWeeklyPriceChange(sku, weeklyTimeSlots,schedule._id);
    }
    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      // await agenda.cancel({ 'data.sku': schedule.sku });
      await scheduleMonthlyPriceChange(sku, monthlyTimeSlots,schedule._id);
    }

  //   if(!weekly && !monthly){
  //     console.log(schedule.price);
  //     await agenda.schedule(new Date(startDate), 'schedule price update', {
  //       sku: schedule.sku,
  //       newPrice: schedule.price,
  //     });

  //     if (endDate) {
  //       console.log(schedule.currentPrice);
  //       await agenda.schedule(new Date(endDate), 'revert price update', {
  //         sku: schedule.sku,
  //         originalPrice: schedule.currentPrice,
  //       });
  //   }
  // }

  if (!weekly && !monthly) {
    await agenda.cancel({ 'data.scheduleId': schedule._id});
    // Instead of scheduling separate tasks, call singleDayScheduleChange
    await singleDayScheduleChange(sku, price, currentPrice, startDate, endDate, schedule._id);
  }

    
    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

*/
app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots } = req.body;

  console.log("Request body:", JSON.stringify(req.body, null, 2));

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
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      await scheduleWeeklyPriceChange(sku, weeklyTimeSlots, schedule._id);
    }

    // Reschedule monthly jobs
    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      await scheduleMonthlyPriceChange(sku, monthlyTimeSlots, schedule._id);
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
/*
const cancelObsoleteJobs = async (oldTimeSlots, newTimeSlots) => {
  console.log("Old time slots:", oldTimeSlots);

  // Collect the timeSlotScheduleIds as strings
  const oldTimeSlotIds = new Set(oldTimeSlots.map(({ timeSlotScheduleId }) => timeSlotScheduleId?.toString()).filter(Boolean));
  const newTimeSlotIds = new Set(newTimeSlots.map(({ timeSlotScheduleId }) => timeSlotScheduleId?.toString()).filter(Boolean));

  for (const oldId of oldTimeSlotIds) {
    // If the old ID no longer exists in the new schedule, cancel the job
    if (!newTimeSlotIds.has(oldId)) {
      console.log(`Attempting to cancel job for timeSlotScheduleId: ${oldId}`);

      try {
        // No need to convert to ObjectId, since it is stored as a string
        console.log(`Cancel query: { 'data.timeSlotScheduleId': "${oldId}" }`);

        // Attempt to cancel the job with the specific timeSlotScheduleId
        const result = await agenda.cancel({ 'data.timeSlotScheduleId': oldId });

        if (result > 0) {
          console.log(`Successfully canceled job for timeSlotScheduleId: ${oldId}`);
        } else {
          console.log(`No jobs found to cancel for timeSlotScheduleId: ${oldId}`);
        }
      } catch (err) {
        console.error(`Error during job cancellation for timeSlotScheduleId: ${oldId}`, err);
      }
    }
  }
};

app.put('/api/schedule/change/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots } = req.body;

  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Prepare updated weekly and monthly slots with preserved timeSlotScheduleId
    const weeklySlotsWithIds = {};
    const monthlySlotsWithIds = {};

    // Process weekly time slots
    for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
      weeklySlotsWithIds[day] = timeSlots.map(slot => ({
        ...slot,
        timeSlotScheduleId: slot.timeSlotScheduleId || new mongoose.Types.ObjectId(), // Preserve existing ID or generate new one
      }));
    }

    // Process monthly time slots
    for (const [date, timeSlots] of Object.entries(monthlyTimeSlots)) {
      monthlySlotsWithIds[date] = timeSlots.map(slot => ({
        ...slot,
        timeSlotScheduleId: slot.timeSlotScheduleId || new mongoose.Types.ObjectId(), // Preserve existing ID or generate new one
      }));
    }

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
      monthlyTimeSlots: schedule.monthlyTimeSlots
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
    schedule.weeklyTimeSlots = weeklySlotsWithIds;
    schedule.monthly = monthly || false;
    schedule.monthlyTimeSlots = monthlySlotsWithIds;

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
        monthlyTimeSlots: schedule.monthlyTimeSlots
      },
      userName,
      timestamp: new Date(),
    });
    await historyLog.save();

    // Cancel jobs for obsolete weekly time slots
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      for (const [day, newTimeSlots] of Object.entries(weeklyTimeSlots)) {
        // Use the get method for accessing values in the Map
        const oldTimeSlots = schedule.weeklyTimeSlots.get(day) || [];
        console.log("Old weekly time slots for day:", day, oldTimeSlots);
        await cancelObsoleteJobs(oldTimeSlots, newTimeSlots);
      }
    }

    // Cancel jobs for obsolete monthly time slots
    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      for (const [date, newTimeSlots] of Object.entries(monthlyTimeSlots)) {
        // Use the get method for accessing values in the Map
        const oldTimeSlots = schedule.monthlyTimeSlots.get(date) || [];
        console.log("Old monthly time slots for date:", date, oldTimeSlots);
        await cancelObsoleteJobs(oldTimeSlots, newTimeSlots);
      }
    }

    // Reschedule only for updated time slots
    if (weekly && Object.keys(weeklyTimeSlots).length > 0) {
      await scheduleWeeklyPriceChange(sku, weeklySlotsWithIds);
    }

    if (monthly && Object.keys(monthlyTimeSlots).length > 0) {
      await scheduleMonthlyPriceChange(sku, monthlySlotsWithIds);
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

*/


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


// Schedule the task to run every day at 12:00 PM Bangladesh time
cron.schedule('0 15 * * *', async () => {
  const bangladeshTime = moment.tz("Asia/Dhaka").format();
  console.log(`Cron job started at Bangladesh Time: ${bangladeshTime}`);
  await fetchAndDownloadDataOnce();
}, {
  timezone: "Asia/Dhaka"
});

// Schedule the task to run at 1:00 PM Bangladesh time every day
cron.schedule('0 16 * * *', async () => {
  try {
    console.log('Scheduled task started at 1:00 PM Bangladesh time...');

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

cron.schedule('30 */1 * * *', async () => {
  console.log('Scheduled task started (every two hours)...');
  
  try {
    // Call your API endpoint
    const response = await axios.get('https://api.priceobo.com/fetch-and-merge'); 
    
  } catch (error) {
    console.error('Error during cron job:', error);
  }
}, {
  timezone: 'Asia/Dhaka', // Set the timezone to Bangladesh (UTC+6)
});

// const axios = require('axios');

// (async () => {
//   try {
//     const response = await axios.get('http://localhost:3000/fetch-and-merge');
//     console.log('Manual API call completed:', response.data);
//   } catch (error) {
//     console.error('Manual API call error:', error.message);
//     if (error.response) {
//       console.error('Response status:', error.response.status);
//       console.error('Response data:', error.response.data);
//     }
//   }
// })();


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
    const listings = await Stock.find();
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all listings' });
  }
});

app.get('/api/jobs/:id',async(req,res)=>{
  const {asin}= req.params;
  try {
    const jobs = await agenda._collection.find({ 'data.asin': asin }).toArray();

    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Error fetching jobs by id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
})


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


app.use("/api/schedule", scheduleRoute);
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/histories",historyRoute);
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});
