const moment = require('moment-timezone');

const updateProductPrice = require("../UpdatePrice/UpdatePrice");
const agenda = require('../Agenda');

const convertEdtToUtcWithDayAdjustmentMonthly = (timeString, date) => {
    const [hours, minutes] = timeString.split(":").map(Number);
  
    
    const edtMoment = moment.tz({ hour: hours, minute: minutes }, "America/New_York");
    const utcMoment = edtMoment.clone().utc();
  
    let newDay = date;
    if (utcMoment.date() !== edtMoment.date()) {
     
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
  
 
    agenda.define(jobName, async (job) => {
      const { sku, newPrice, scheduleId } = job.attrs.data;
  
      try {
        await updateProductPrice(sku, newPrice);
        console.log(`Monthly price update applied for SKU: ${sku}, new price: ${newPrice}, date: ${startDate}, slot: ${timeSlot.startTime}`);
      } catch (error) {
        console.error(`Failed to apply monthly price update for SKU: ${sku}, date: ${startDate}, slot: ${timeSlot.startTime}`, error);
      }
    });
  
  
    agenda.define(`revert_${revertJobName}`, { priority: 10 }, async (job) => {
      const { sku, revertPrice } = job.attrs.data;
  
      try {
        await updateProductPrice(sku, revertPrice);
        console.log(`Monthly Price reverted for SKU: ${sku}, revert price: ${revertPrice}, date: ${endDate}, slot: ${timeSlot.endTime}`);
      } catch (error) {
        console.error(`Failed to revert price for SKU: ${sku}, date: ${endDate}, slot: ${timeSlot.endTime}`, error);
      }
    });
  }
  
  
  const scheduleMonthlyPriceChangeFromEdt = async (sku, monthlySlots, scheduleId) => {
    for (const [date, timeSlots] of Object.entries(monthlySlots)) {
      for (const timeSlot of timeSlots) {
        
      
        const startTimeUtc = convertEdtToUtcWithDayAdjustmentMonthly(timeSlot.startTime,Number(date));
        const endTimeUtc = convertEdtToUtcWithDayAdjustmentMonthly(timeSlot.endTime,Number(date));
  
        const [startHour, startMinute] = timeSlot.startTime.split(':');
        const [endHour, endMinute] = timeSlot.endTime.split(':');
      
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
  
  
  
  const monthlyConvertBSTtoUTCForEDT = (inputTime) => {
   
    const [hours, minutes] = inputTime.split(':').map(Number);
  
    const currentDateInBST = moment.tz('Asia/Dhaka').set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0
    });
  
    
    const edtDateTime = currentDateInBST.tz('America/New_York', true);
  
   
    const utcDateTime = edtDateTime.utc(); 
  
    console.log(`Input Time (BST): ${inputTime} -> Treated as EDT: ${edtDateTime.format()} -> Scheduled in UTC: ${utcDateTime.format()}`);
  
    return utcDateTime.toDate(); 
  };
  
  async function defineMonthlyJob(sku, startDate,endDate, timeSlot) {
   
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

    agenda.define(updateJobName, { priority: 10 }, async (job) => {
      const { sku, newPrice } = job.attrs.data;
      try {
        await updateProductPrice(sku, newPrice);
        console.log(`Monthly Price updated for SKU: ${sku} at ${startTimeInUTC} UTC`);
      } catch (error) {
        console.error(`Failed to update price for SKU: ${sku}`, error);
      }
    });
  
   
    agenda.define(revertJobName, { priority: 10 }, async (job) => {
      const { sku, revertPrice } = job.attrs.data;
      try {
        await updateProductPrice(sku, revertPrice);
        console.log(`Monthly Price reverted for SKU: ${sku} at ${endTimeInUTC} UTC`);
      } catch (error) {
        console.error(`Failed to revert price for SKU: ${sku}`, error);
      }
    });
  }
  
  const scheduleMonthlyPriceChange = async (sku, monthlyTimeSlots, scheduleId) => {
    for (const [date, timeSlots] of Object.entries(monthlyTimeSlots)) {
      for (const timeSlot of timeSlots) {
      
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
      
        const startHourUTC = startTimeInUTC.getUTCHours();
        const startMinuteUTC = startTimeInUTC.getUTCMinutes();
        const endHourUTC = endTimeInUTC.getUTCHours();
        const endMinuteUTC = endTimeInUTC.getUTCMinutes();
  
     
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
  

  module.exports ={scheduleMonthlyPriceChangeFromEdt,scheduleMonthlyPriceChange}