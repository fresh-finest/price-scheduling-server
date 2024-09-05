
const express = require('express');
const dayjs = require('dayjs'); 


const Agenda = require('agenda');
const { updateProductPrice } = require('../service/ApiService');
require('dotenv').config();

const agenda = new Agenda({ db: { address: MONGO_URI, collection: 'jobs' } });

agenda.define('schedule price update', async (job) => {
    const { sku, newPrice } = job.attrs.data;
    await updateProductPrice(sku, newPrice);
    console.log(`Price updated for SKU: ${sku} to ${newPrice}`);
  });
  
  
  agenda.define('revert price update', async (job) => {
    const { sku, originalPrice } = job.attrs.data;
    await updateProductPrice(sku, originalPrice);
    console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
  });
  

agenda.define('weekly price update', async (job) => {
    const { sku, newPrice } = job.attrs.data;
  
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Weekly price update applied for SKU: ${sku}, new price: ${newPrice}`);
    } catch (error) {
      console.error(`Failed to apply weekly price update for SKU: ${sku}`, error);
    }
  });
  
  
  agenda.define('revert weekly price update', async (job) => {
    const { sku, originalPrice } = job.attrs.data;
  
    try {
      await updateProductPrice(sku, originalPrice);
      console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}`, error);
    }
  });

 
agenda.define('monthly price update', async (job) => {
    const { sku, newPrice } = job.attrs.data;
  
    try {
      await updateProductPrice(sku, newPrice);
      console.log(`Monthly price update applied for SKU: ${sku}, new price: ${newPrice}`);
    } catch (error) {
      console.error(`Failed to apply monthly price update for SKU: ${sku}`, error);
    }
  });
  
  
  agenda.define('revert monthly price update', async (job) => {
    const { sku, originalPrice } = job.attrs.data;
  
    try {
      await updateProductPrice(sku, originalPrice);
      console.log(`Price reverted for SKU: ${sku} to ${originalPrice}`);
    } catch (error) {
      console.error(`Failed to revert price for SKU: ${sku}`, error);
    }
  });
  
async function scheduleMonthlyPriceChange(sku, newPrice, originalPrice, datesOfMonth, startTime, endTime) {
    for (const date of datesOfMonth) {
      const [startHour, startMinute] = startTime.split(':');
      const [endHour, endMinute] = endTime.split(':');
  
      const updateCron = `${startMinute} ${startHour} ${date} * *`; 
      const revertCron = `${endMinute} ${endHour} ${date} * *`; 
  
      const updateJobName = `monthly price update ${sku} date ${date}`;
      const revertJobName = `revert monthly price update ${sku} date ${date}`;
  
      await agenda.every(updateCron, updateJobName, { sku, newPrice });
      await agenda.every(revertCron, revertJobName, { sku, originalPrice });
    }
  }
  
  async function scheduleWeeklyPriceChange(sku, newPrice, originalPrice, daysOfWeek, startTime, endTime) {
    for (const day of daysOfWeek) {
      const [startHour, startMinute] = startTime.split(':');
      const [endHour, endMinute] = endTime.split(':');
  
      const updateCron = `${startMinute} ${startHour} * * ${day}`; 
      const revertCron = `${endMinute} ${endHour} * * ${day}`; 
  
      const updateJobName = `weekly price update ${sku} day ${day}`;
      const revertJobName = `revert weekly price update ${sku} day ${day}`;
  
      await agenda.every(updateCron, updateJobName, { sku, newPrice });
      await agenda.every(revertCron, revertJobName, { sku, originalPrice });
    }
  }

  
(async function () {
  await agenda.start();
})();

// post /api/schedule/change

exports.createNewSchedule= async(req,res,next)=>{
    const {
        userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate,
        weekly, daysOfWeek, monthly, datesOfMonth, startTime, endTime
      } = req.body;
    
      try {
       
        const newSchedule = new PriceSchedule({
          userName, asin, sku, title, price, currentPrice, imageURL, startDate, endDate,
          weekly, daysOfWeek, monthly, datesOfMonth, startTime, endTime
        });
        await newSchedule.save();
    
      
        const historyLog = new History({
          scheduleId: newSchedule._id,
          action: 'created',
          userName, asin, sku, title, price, currentPrice, imageURL,
          startDate, endDate, weekly, daysOfWeek, monthly, datesOfMonth, startTime, endTime,
          timestamp: new Date(),
        });
        await historyLog.save();
    
       
        if (weekly && daysOfWeek && daysOfWeek.length > 0) {
          console.log(daysOfWeek);
          await scheduleWeeklyPriceChange(sku, price, currentPrice, daysOfWeek, startTime, endTime);
        }
    
       
        if (monthly && datesOfMonth && datesOfMonth.length > 0) {
          console.log(datesOfMonth);
          await scheduleMonthlyPriceChange(sku, price, currentPrice, datesOfMonth, startTime, endTime);
        }
    
      
        if (!weekly && !monthly) {
          await agenda.schedule(new Date(`${startDate} ${startTime}`), 'schedule price update', { asin, sku, newPrice: price });
          if (endDate) {
            await agenda.schedule(new Date(`${endDate} ${endTime}`), 'revert price update', { asin, sku, originalPrice: currentPrice });
          }
        }
    
        res.json({ success: true, message: 'Schedule saved and jobs queued successfully.', schedule: newSchedule });
      } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).json({ error: 'Failed to save schedule' });
      }
}

// put /api/schedule/change/:id
exports.updateOldSchedule=async(req,res,next)=>{
    const { id } = req.params;
  const { startDate, endDate, price, currentPrice, userName, title, asin, sku, imageURL,weekly, daysOfWeek, monthly, datesOfMonth  } = req.body;

  try {
    const schedule = await PriceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    
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
      daysOfWeek:schedule.daysOfWeek,
      monthly:schedule.monthly,
      datesOfMonth:schedule.datesOfMonth
    };

    
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
    schedule.daysOfWeek = daysOfWeek || [];
    schedule.monthly = monthly || false;
    schedule.datesOfMonth = datesOfMonth || [];
    await schedule.save();

   
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
        daysOfWeek: schedule.daysOfWeek,
        monthly: schedule.monthly,
        datesOfMonth: schedule.datesOfMonth,
      },
      userName, 
      timestamp: new Date(),
    });
    await historyLog.save();
    
   
    await agenda.cancel({ 'data.sku': schedule.sku });

   

    if(weekly && daysOfWeek.length > 0){
      console.log(daysOfWeek);
      await scheduleWeeklyPriceChange(sku,price,currentPrice,daysOfWeek);
    }
    if(monthly && datesOfMonth.length > 0){
      console.log(datesOfMonth);
      await scheduleMonthlyPriceChange(sku,price,currentPrice,datesOfMonth);

    }

    if(!weekly && !monthly){
      await agenda.schedule(new Date(startDate), 'schedule price update', {
        sku: schedule.sku,
        newPrice: price,
      });

      if (endDate) {
        await agenda.schedule(new Date(endDate), 'revert price update', {
          sku: schedule.sku,
          originalPrice: currentPrice,
        });
    }
  }
    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
}

// path   delete /api/schedule/change/:id
exports.deleteSchedule=async(req,res,next)=>{
    const { id } = req.params;
  
    try {
     
      const schedule = await PriceSchedule.findById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
  
     
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
        previousState: { ...schedule.toObject() },
        timestamp: new Date(),
      });
      await historyLog.save();
  
     
      schedule.status = 'deleted';
      await schedule.save();
  
     
      await agenda.cancel({ 'data.sku': schedule.sku });
  
      res.json({ success: true, message: 'Schedule marked as deleted and associated jobs canceled.' });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
}

