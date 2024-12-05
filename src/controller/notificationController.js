const { default: mongoose } = require("mongoose");
const Notification = require("../model/Notification");
const { createNotificationService, getNotificationService, deleteNotificationService } = require("../service/notificationService")


exports.createNotification = async(req,res,next)=>{
    try {
        const result = await createNotificationService(req.body);
        res.status(200).json({
            status:"Success",
            message:"Successfully create notidfication",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Failed",
            message:"Failed to create notifications",
            error:error.message
        })
    }
}

exports.getNotification = async(req,res,next)=>{
    try {
        const result = await getNotificationService();
        res.status(400).json({
            status:"Success",
            message:"Successfully fetched notification.",
            result
        })
    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message:"Failed to get notificatoion",
            error:error.message
        })
    }
}

exports.deleteNotificatoion = async(req,res,next)=>{
    const {id}= req.params;
    try {
        await deleteNotificationService(id);
        res.status(200).json({
            status:"Success",
            message:"Successfully deleted notification"
        })
    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message:"Couldn't delete notification",
            error:error.message
        })
    }
}
/*
exports.updateNotificationStatus = async(req,res,next)=>{
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.notificationId,
            {status:"read"},
            {new: true}
        )

        res.status(200).json({
            success:true,
            notification
        })
    } catch (error) {
       res.status(500).json({
        success:false,
        message: error.message
       }) 
    }
}
    */

exports.updateNotificationStatus = async(req,res,next)=>{
    try {
        const {id} = req.params;
        const notificationId = id;
        console.log(id)
        const {status} = req.body;
       if(!mongoose.Types.ObjectId.isValid(notificationId)){
        return res.status(400).json({
            success:true,
            message:"Invalid Notification ID",
        })
       }
       if(!status || typeof status !=="string"){
        return res.status(400).json({
            success:false,
            "message":"Status is required and should be a string."
        })
       }

       const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {status},
        {new: true}
       )

       if(!notification){
        return res.status(404).json({
            success:false,
            message:"Notification not found",
        })
       }
       res.status(200).json({
        success:true,
        notification,
       })


    } catch (error) {
        res.status(200).json({
            success:false,
            message:error.message
        })
    }
}