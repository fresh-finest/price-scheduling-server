
const moment = require('moment-timezone');

const updateProductPrice = require("../UpdatePrice/UpdatePrice");
const agenda = require('../Agenda');

const convertEdtToUtcWithDayAdjustment = (timeString, day) => {
    const [hours, minutes] = timeString.split(":").map(Number);
  
   
    const edtMoment = moment.tz({ hour: hours, minute: minutes }, "America/New_York");
  
    const utcMoment = edtMoment.clone().utc();
  
   
    let newDay = day;
    if (utcMoment.date() !== edtMoment.date()) {
     
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
  
   
    agenda.define(jobName, async (job) => {
      const { sku, newPrice } = job.attrs.data;
      try {
        await updateProductPrice(sku, newPrice);
        console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}, day: ${startDay}, slot: ${timeSlot.startTime}`);
      } catch (error) {
        console.error(`Failed to apply weekly price update for SKU: ${sku}, day: ${startDay}, slot: ${timeSlot.startTime}`, error);
      }
    });
  
    agenda.define(revertJobName, async (job) => {
      const { sku, revertPrice } = job.attrs.data;
      try {
        await updateProductPrice(sku, revertPrice);
        console.log(`Weekly Price reverted for SKU: ${sku}, revert price: ${revertPrice}, day: ${endDay}, slot: ${timeSlot.endTime}`);
      } catch (error) {
        console.error(`Failed to revert price for SKU: ${sku}, day: ${endDay}, slot: ${timeSlot.endTime}`, error);
      }
    });
  }
  
  const scheduleWeeklyPriceChangeFromEdt = async (sku, weeklyTimeSlots, scheduleId) => {
    for (const [day, timeSlots] of Object.entries(weeklyTimeSlots)) {
      for (const timeSlot of timeSlots) {
       
        const startTimeUtc = convertEdtToUtcWithDayAdjustment(timeSlot.startTime, Number(day));
        const endTimeUtc = convertEdtToUtcWithDayAdjustment(timeSlot.endTime, Number(day));
  
    
        const updateCron = `${startTimeUtc.minute} ${startTimeUtc.hour} * * ${startTimeUtc.day}`;
        const revertCron = `${endTimeUtc.minute} ${endTimeUtc.hour} * * ${endTimeUtc.day}`;
        
        const updateJobName = `weekly_price_update_${sku}_day_${startTimeUtc.day}_slot_${timeSlot.startTime}`;
        const revertJobName = `revert_weekly_price_update_${sku}_day_${endTimeUtc.day}_slot_${timeSlot.endTime}`;
  
      
        await defineWeeklyJobUtc(sku, startTimeUtc.day, endTimeUtc.day, timeSlot);
  
       
        await agenda.every(updateCron, updateJobName, { sku, newPrice: timeSlot.newPrice, day: startTimeUtc.day, scheduleId }, { timezone: 'UTC' });
        console.log(`Scheduled weekly price update for SKU: ${sku} on day ${startTimeUtc.day} at ${timeSlot.startTime} EDT (${startTimeUtc.hour}:${startTimeUtc.minute} UTC)`);
  
        await agenda.every(revertCron, revertJobName, { sku, revertPrice: timeSlot.revertPrice, day: endTimeUtc.day, scheduleId }, { timezone: 'UTC' });
        console.log(`Scheduled weekly price revert for SKU: ${sku} on day ${endTimeUtc.day} at ${timeSlot.endTime} EDT (${endTimeUtc.hour}:${endTimeUtc.minute} UTC)`);
      }
    }
  };
  
  
  
  
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
        console.log(`Weekly Price updated for SKU: ${sku} at ${startTimeInUTC} UTC`);
      } catch (error) {
        console.error(`Failed to update price for SKU: ${sku}`, error);
      }
    });
  
    agenda.define(revertJobName, { priority: 5 }, async (job) => {
      const { sku, revertPrice } = job.attrs.data;
      try {
        await updateProductPrice(sku, revertPrice);
        console.log(`Weekly Price reverted for SKU: ${sku} at ${endTimeInUTC} UTC`);
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
  

  module.exports = {
    scheduleWeeklyPriceChange,
    scheduleWeeklyPriceChangeFromEdt,
  };
  