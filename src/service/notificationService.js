const Notification = require("../model/Notification")


exports.createNotificationService = async(data)=>{
    const notification = await Notification.create(data);
    return notification;
}

exports.getNotificationService = async()=>{
    const notifications = await Notification.find({});
    return notifications;
}

exports.deleteNotificationService = async(id)=>{
    const deleteNotification = await Notification.deleteOne({_id:id})
    return deleteNotification;
}