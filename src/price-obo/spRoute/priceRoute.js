const express = require('express');
const router = express.Router();
const {agenda} = require('../Agenda');
const PriceSchedule = require('../../model/PriceSchedule');
const History = require('../../model/HistorySchedule');
const singleDayScheduleChange = require('../JobSchedule/SingleDayJob');
const { scheduleMonthlyPriceChangeFromEdt, scheduleMonthlyPriceChange } = require('../JobSchedule/MonthlyJob');
const { scheduleWeeklyPriceChangeFromEdt, scheduleWeeklyPriceChange } = require('../JobSchedule/WeeklyJob');


router.post('/api/schedule/change', async (req, res) => {
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
      
  
      console.log("new schedule id"+newSchedule._id)
      if (timeZone !=="America/New_York" && weekly && Object.keys(weeklyTimeSlots).length > 0) {
        console.log("slots: "+JSON.stringify(weeklyTimeSlots));
        await scheduleWeeklyPriceChange(sku, weeklyTimeSlots,newSchedule._id,timeZone);
      }
      if (timeZone ==="America/New_York" && weekly && Object.keys(weeklyTimeSlots).length > 0) {
        console.log("slots from new work: "+JSON.stringify(weeklyTimeSlots));
        await scheduleWeeklyPriceChangeFromEdt(sku, weeklyTimeSlots,newSchedule._id);
      }
  
     
      if (timeZone !=="America/New_York" && monthly && Object.keys(monthlyTimeSlots).length > 0) {
        console.log("slots: "+JSON.stringify(monthlyTimeSlots));
        await scheduleMonthlyPriceChange(sku, monthlyTimeSlots,newSchedule._id,timeZone);
      }
      if (timeZone ==="America/New_York" && monthly && Object.keys(monthlyTimeSlots).length > 0) {
        console.log("slots from new work: "+JSON.stringify(monthlyTimeSlots));
        await scheduleMonthlyPriceChangeFromEdt(sku, monthlyTimeSlots,newSchedule._id);
      }
     
  
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
  
  
  router.put('/api/schedule/change/:id', async (req, res) => {
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
  
  
  
  router.delete('/api/schedule/change/:id', async (req, res) => {
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


  module.exports = router;
