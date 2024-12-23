const { saveSellerMessageService,getAllMessagesService, getMessageBySellerService, addSupportResponseService } = require("../service/messageService");

exports.saveSellerMessage = async(req,res,next)=>{
    try {
        const {sellerId,sellerMessage} = req.body;
        const result = await saveSellerMessageService(sellerId,sellerMessage);
        res.status(201).json({
            status:"Success",
            message:"Successfully saved message",
            result
        })
    } catch (error) {
        next(error);
    }
}

exports.getAllMessages = async(req,res,next)=>{
    try {
        const result = await getAllMessagesService();
        res.status(200).json({
            status:"Success",
            message:"Successfully fetched messages",
            result
        })
    } catch (error) {
        next(error);
    }
}


exports.getMessageBySeller = async(req,res,next)=>{
    try {
        const {sellerId} = req.params;
        const result = await getMessageBySellerService(sellerId);
        res.status(200).json({
            status:"Success",
            message:"Successfully fetched messages",
            result
        })
    } catch (error) {
        next(error);
    }
}

exports.addSupportResponse = async(req,res,next)=>{
    try {
        const {messageId} = req.params;
        const {supportResponse} = req.body;
        const result = await addSupportResponseService(messageId,supportResponse);
        res.status(200).json({
            status:"Success",
            message:"Successfully added support response",
            result
        })
    } catch (error) {
        next(error);
    }
}