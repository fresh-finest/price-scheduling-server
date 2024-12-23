const Ownernotification = require("../model/Ownernotification")

exports.createNotificationService = async(data)=>{
    console.log(data);
    const notificaiton = await Ownernotification.create(data);
    console.log(notificaiton);
    return notificaiton;
}

exports.getNotificationService = async()=>{
    const notification = await Ownernotification.find().sort({createdAt:-1});
    return notification;
}

exports.getUnreadNotificationService = async()=>{
    const notificaiton = await Ownernotification.find({read:false}).sort({createdAt:-1});
    return notificaiton;
}

exports.markNotificationAsReadService = async(notificationId)=>{
    return await Ownernotification.findByIdAndUpdate(
        notificationId,
        {read:true},
        {new: true}
    )
}
exports.deleteNotificationService = async(notificaitonId)=>{
    return Ownernotification.findByIdAndDelete(notificaitonId);
}
