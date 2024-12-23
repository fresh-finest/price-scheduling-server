const { getNotificationService, createNotificationService, getUnreadNotificationService, markNotificationAsReadService, deleteNotificationService } = require("../service/ownernotificationService");


exports.createNotification = async(req,res)=>{
    try {
        // const {type,message,receiver} = req.body;

        // if(!type || !message || !receiver){
        //     return res.status(400).json({ error: 'Type, message, and receiver are required' });
        // }
        const notification = await createNotificationService(req.body);
        res.status(201).json(notification)
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.getNotifications = async(req,res)=>{
    try {
        const notification = await getNotificationService();
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.getUnreadNotifications = async(req,res)=>{
    try {
        const notification = await getUnreadNotificationService();
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.getmarkedNotificationAsRead = async(req,res)=>{
    try {
        const {id} = req.params;
        const notification = await markNotificationAsReadService(id);

        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.deleteNotification = async(req,res)=>{
    try {
        const {id} = req.params;
        const notification = await deleteNotificationService(id);
        if(!notification){
            return res.status(404).json({error:"Notification not found"});
        }
        res.status(200).json({message:"Success fully deleted!"})
    } catch (error) {
        
    }
}