
const moment = require('moment-timezone');

const updateProductPrice = require("../UpdatePrice/UpdatePrice");
const {agenda} = require('../Agenda');

const singleConvertBSTtoUTCForEDT = (inputDateTime) => {
   
    const edtDateTime = moment.tz(inputDateTime, 'Asia/Dhaka').tz('America/New_York', true); 
    
   
    const utcDateTime = edtDateTime.clone().utc(); 
    
    console.log(`Input Time (BST): ${inputDateTime} -> Treated as EDT: ${edtDateTime.format()} -> Scheduled in UTC: ${utcDateTime.format()}`);
    
    return utcDateTime.toDate(); 
  }
  
  
  
  
  
  const singleDayScheduleChange = async (sku, newPrice, originalPrice, startDate, endDate, scheduleId, userTimeZone = '') => {
    console.log("User Time Zone:", userTimeZone);
    try {
    
      const validStartDate = new Date(startDate);
      const validEndDate = endDate ? new Date(endDate) : null;
  
      if (isNaN(validStartDate.getTime()) || (validEndDate && isNaN(validEndDate.getTime()))) {
        throw new Error('Invalid start or end date');
      }
  
      let adjustedStartDate = validStartDate;
      let adjustedEndDate = validEndDate;
  
      
      if (userTimeZone === 'Asia/Dhaka') {
        adjustedStartDate = singleConvertBSTtoUTCForEDT(validStartDate); 
        adjustedEndDate = validEndDate ? singleConvertBSTtoUTCForEDT(validEndDate) : null; 
      }
  
    
      const updateJobName = `schedule_price_update_${sku}_${adjustedStartDate.toISOString()}`;
     
      agenda.define(updateJobName, { priority: 1 }, async (job) => {
        const { sku, newPrice, scheduleId } = job.attrs.data;
        try {
          await updateProductPrice(sku, newPrice);
          console.log(`Single Price updated for SKU: ${sku} (Schedule ID: ${scheduleId})`);
        } catch (error) {
          console.error(`Failed to update price for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
        }
      });
  
      await agenda.schedule(adjustedStartDate.toISOString(), updateJobName, { sku, newPrice, scheduleId });
      console.log(`Single scheduled price update for SKU: ${sku} at ${adjustedStartDate} to ${newPrice} (Schedule ID: ${scheduleId})`);
  
     
      if (adjustedEndDate) {
        const revertJobName = `revert_price_update_${sku}_${adjustedEndDate.toISOString()}`;
  
        agenda.define(revertJobName, { priority: 1 }, async (job) => {
          const { sku, originalPrice, scheduleId } = job.attrs.data;
          try {
            await updateProductPrice(sku, originalPrice);
            console.log(`Single Price reverted for SKU: ${sku} to ${originalPrice} (Schedule ID: ${scheduleId})`);
          } catch (error) {
            console.error(`Failed to revert price for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
          }
        });
  
        await agenda.schedule(adjustedEndDate.toISOString(), revertJobName, { sku, originalPrice, scheduleId });
        console.log(`Single scheduled price revert for SKU: ${sku} at ${adjustedEndDate} to ${originalPrice} (Schedule ID: ${scheduleId})`);
      }
  
    } catch (error) {
      console.error(`Error scheduling price changes for SKU: ${sku} (Schedule ID: ${scheduleId})`, error);
    }
  };

//   (async function () {
//   await agenda.start();
// })();

  module.exports = singleDayScheduleChange;