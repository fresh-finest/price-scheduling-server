const axios = require("axios");
const moment = require("moment-timezone");
const { fetchAccessToken } = require("../middleware/accessToken");
const { marketplace_id } = require("../middleware/credentialMiddleware");
const Report = require("../model/Report");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSalesMetrics = async (
  sku,
  startDate,
  endDate,
  startTime = "00:00:00",
  endTime = "23:59:59"
) => {
  try {
    const accessToken = await fetchAccessToken();
    const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

    let startDateTimeUTC = moment
      .tz(
        `${startDate} ${startTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "America/New_York"
      )
      .utc();
    let endDateTimeUTC = moment
      .tz(`${endDate} ${endTime}`, "YYYY-MM-DD HH:mm:ss", "America/New_York")
      .utc();

    if (startDateTimeUTC.isSameOrAfter(endDateTimeUTC)) {
      console.warn("Swapping start and end times for valid interval.");
      [startDateTimeUTC, endDateTimeUTC] = [endDateTimeUTC, startDateTimeUTC];
    }

    const interval = `${startDateTimeUTC.format(
      "YYYY-MM-DDTHH:mm:ss[Z]"
    )}--${endDateTimeUTC.format("YYYY-MM-DDTHH:mm:ss[Z]")}`;
    console.log("Valid Interval:", interval);

    const params = {
      marketplaceIds: marketplace_id,
      interval: interval,
      granularity: "Hour",
      granularityTimeZone: "UTC",
      sku: sku,
    };

    const response = await axios.get(url, {
      headers: {
        "x-amz-access-token": accessToken,
        "x-amz-date": new Date().toISOString(),
        "Content-Type": "application/json",
      },
      params: params,
    });

    if (response.data && response.data.payload) {
      const metrics = response.data.payload.reduce(
        (acc, metric) => {
          acc.unitCount += metric.unitCount;
          acc.totalSalesAmount = metric.totalSalesAmount
            ? parseFloat(metric.totalSalesAmount.amount)
            : 0;
          return acc;
        },
        { unitCount: 0, totalSalesAmount: 0 }
      );

      return {
        sku,
        interval: `${startDate} ${startTime} - ${endDate} ${endTime}`,
        unitCount: metrics.unitCount,
      };
    } else {
      throw new Error("Unexpected API response format");
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn("Rate limit reached, delaying...");
      await delay(2000); // Wait for 2 seconds before retrying
      return await fetchSalesMetrics(
        sku,
        startDate,
        endDate,
        startTime,
        endTime
      );
    }
    console.error("Error fetching sales metrics:", error.message);
    throw error;
  }
};
/*
const processReport = async (reports) => {
  const result = [];
  const today = moment().utc().startOf('day');

  for (const report of reports) {
      const { sku, title: itemName, imageURL: imageUrl, price, weekly, weeklyTimeSlots, monthly, monthlyTimeSlots, startDate, endDate, timeZone, createdAt } = report;

      // Use createdAt as the base date
      const createdAtDate = moment(createdAt).tz(timeZone).startOf('day');

      // Handle single-day schedules
      if (!weekly && !monthly) {
          const date = moment(startDate).tz(timeZone).startOf('day');
          if (date.isAfter(today)) continue;

          const formattedDate = date.format('YYYY-MM-DD');
          const startTime = moment(startDate).tz(timeZone).format('HH:mm:ss');
          const endTime = moment(endDate).tz(timeZone).format('HH:mm:ss');

          const metrics = await fetchSalesMetrics(sku, formattedDate, formattedDate, startTime, endTime);
          const reportData = {
              sku,
              itemName,
              imageUrl,
              price,
              scheduleType: 'single',
              interval: `${formattedDate} ${startTime} - ${formattedDate} ${endTime}`,
              weekly: false,
              monthly: false,
              ...metrics,
          };

          await Report.updateOne(
              { sku, interval: reportData.interval, scheduleType: 'single' },
              { $set: reportData },
              { upsert: true }
          );

          result.push(reportData);
          await delay(1000);
      }

      // Handle weekly schedules
      if (weekly && !monthly) {
          for (const [dayOfWeek, timeSlots] of Object.entries(weeklyTimeSlots)) {
              for (const timeSlot of timeSlots) {
                  const weekDate = createdAtDate.clone().day(parseInt(dayOfWeek));
                  const newPrice = timeSlot.newPrice;

                  if (weekDate.isAfter(today)) continue;

                  const formattedDate = weekDate.format('YYYY-MM-DD');
                  const metrics = await fetchSalesMetrics(sku, formattedDate, formattedDate, timeSlot.startTime, timeSlot.endTime);
                  const reportData = {
                      sku,
                      itemName,
                      imageUrl,
                      price: newPrice,
                      scheduleType: 'weekly',
                      interval: `${formattedDate} ${timeSlot.startTime} - ${formattedDate} ${timeSlot.endTime}`,
                      weekly: true,
                      monthly: false,
                      dayOfWeek: parseInt(dayOfWeek), // Include dayOfWeek
                      ...metrics,
                  };

                  await Report.updateOne(
                      { sku, interval: reportData.interval, scheduleType: 'weekly', dayOfWeek: reportData.dayOfWeek },
                      { $set: reportData },
                      { upsert: true }
                  );

                  result.push(reportData);
                  await delay(1000);
              }
          }
      }

      // Handle monthly schedules
      if (monthly && !weekly) {
          for (const [dateOfMonth, timeSlots] of Object.entries(monthlyTimeSlots)) {
              for (const timeSlot of timeSlots) {
                  const monthDate = createdAtDate.clone().date(parseInt(dateOfMonth));
                  const newPrice = timeSlot.newPrice;

                  if (monthDate.isAfter(today)) continue;

                  const formattedDate = monthDate.format('YYYY-MM-DD');
                  const metrics = await fetchSalesMetrics(sku, formattedDate, formattedDate, timeSlot.startTime, timeSlot.endTime);
                  const reportData = {
                      sku,
                      itemName,
                      imageUrl,
                      price: newPrice,
                      scheduleType: 'monthly',
                      interval: `${formattedDate} ${timeSlot.startTime} - ${formattedDate} ${timeSlot.endTime}`,
                      weekly: false,
                      monthly: true,
                      dateOfMonth: parseInt(dateOfMonth), // Include dateOfMonth
                      ...metrics,
                  };

                  await Report.updateOne(
                      { sku, interval: reportData.interval, scheduleType: 'monthly', dateOfMonth: reportData.dateOfMonth },
                      { $set: reportData },
                      { upsert: true }
                  );

                  result.push(reportData);
                  await delay(1000);
              }
          }
      }
  }

  return result;
};
*/
const processReport = async (reports) => {
  const result = [];
  const today = moment().utc().startOf('day'); // Today's date in UTC

  for (const report of reports) {
    const {
      sku,
      title: itemName,
      imageURL: imageUrl,
      price,
      weekly,
      weeklyTimeSlots,
      monthly,
      monthlyTimeSlots,
      startDate,
      endDate,
      timeZone,
      createdAt,
    } = report;

    const createdAtDate = moment(createdAt).tz(timeZone).startOf('day'); // Base date for schedules

    // Handle single-day schedules
    if (!weekly && !monthly) {
      const date = moment(startDate).tz(timeZone).startOf('day');
      if (date.isAfter(today)) continue;

      const formattedDate = date.format('YYYY-MM-DD');
      const startTime = moment(startDate).tz(timeZone).format('HH:mm:ss');
      const endTime = moment(endDate).tz(timeZone).format('HH:mm:ss');

      const metrics = await fetchSalesMetrics(sku, formattedDate, formattedDate, startTime, endTime);
      const reportData = {
        sku,
        itemName,
        imageUrl,
        price,
        scheduleType: 'single',
        interval: `${formattedDate} ${startTime} - ${formattedDate} ${endTime}`,
        weekly: false,
        monthly: false,
        ...metrics,
      };

      await Report.updateOne(
        { sku, interval: reportData.interval, scheduleType: 'single' },
        { $set: reportData },
        { upsert: true }
      );

      result.push(reportData);
      await delay(1000);
    }

    // Handle weekly schedules
    if (weekly && !monthly) {
      for (const [dayOfWeek, timeSlots] of Object.entries(weeklyTimeSlots)) {
        for (const timeSlot of timeSlots) {
          // Calculate the first applicable date based on the createdAt date
          let firstApplicableDate = createdAtDate.clone().day(parseInt(dayOfWeek));
          if (firstApplicableDate.isBefore(createdAtDate)) {
            firstApplicableDate.add(7, 'days'); // Move to the next applicable week
          }

          // Process each applicable week
          let currentWeek = firstApplicableDate.clone();
          while (!currentWeek.isAfter(today)) {
            const formattedDate = currentWeek.format('YYYY-MM-DD');
            const newPrice = timeSlot.newPrice;

            const metrics = await fetchSalesMetrics(sku, formattedDate, formattedDate, timeSlot.startTime, timeSlot.endTime);
            const reportData = {
              sku,
              itemName,
              imageUrl,
              price: newPrice,
              scheduleType: 'weekly',
              interval: `${formattedDate} ${timeSlot.startTime} - ${formattedDate} ${timeSlot.endTime}`,
              weekly: true,
              monthly: false,
              dayOfWeek: parseInt(dayOfWeek),
              ...metrics,
            };

            await Report.updateOne(
              { sku, interval: reportData.interval, scheduleType: 'weekly', dayOfWeek: reportData.dayOfWeek },
              { $set: reportData },
              { upsert: true }
            );

            result.push(reportData);
            currentWeek.add(7, 'days'); // Move to the next week
            await delay(1000);
          }
        }
      }
    }

    // Handle monthly schedules
    if (monthly && !weekly) {
      for (const [dateOfMonth, timeSlots] of Object.entries(monthlyTimeSlots)) {
        for (const timeSlot of timeSlots) {
          // Calculate the first applicable date based on the createdAt date
          let firstApplicableDate = createdAtDate.clone().date(parseInt(dateOfMonth));
          if (firstApplicableDate.isBefore(createdAtDate)) {
            firstApplicableDate.add(1, 'month'); // Move to the next applicable month
          }

          // Process each applicable month
          let currentMonth = firstApplicableDate.clone();
          while (!currentMonth.isAfter(today)) {
            const formattedDate = currentMonth.format('YYYY-MM-DD');
            const newPrice = timeSlot.newPrice;

            const metrics = await fetchSalesMetrics(sku, formattedDate, formattedDate, timeSlot.startTime, timeSlot.endTime);
            const reportData = {
              sku,
              itemName,
              imageUrl,
              price: newPrice,
              scheduleType: 'monthly',
              interval: `${formattedDate} ${timeSlot.startTime} - ${formattedDate} ${timeSlot.endTime}`,
              weekly: false,
              monthly: true,
              dateOfMonth: parseInt(dateOfMonth),
              ...metrics,
            };

            await Report.updateOne(
              { sku, interval: reportData.interval, scheduleType: 'monthly', dateOfMonth: reportData.dateOfMonth },
              { $set: reportData },
              { upsert: true }
            );

            result.push(reportData);
            currentMonth.add(1, 'month'); // Move to the next month
            await delay(1000);
          }
        }
      }
    }
  }

  return result;
};




module.exports = processReport;
