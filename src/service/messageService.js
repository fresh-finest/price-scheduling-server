const { text } = require("body-parser");
const Message = require("../model/Message")


exports.saveSellerMessageService = async(sellerId,sellerMessage)=>{
    try {
        const message = new Message({
            sellerId,
            sellerMessage
        });
        return await message.save();
    } catch (error) {
        throw new Error(`Error saving customer message: ${error.message}`);
    }
}

exports.getAllMessagesService = async()=>{
    try {
        return await Message.find().sort({createdAt:-1});
        } catch (error) {
        throw new Error(`Error fetching message ${error.message}`);
    }
}

exports.getMessageBySellerService = async(sellerId)=>{
    try {
        return await Message.find({sellerId});
    } catch (error) {
        throw new Error(`Error fetching seller messages: ${error.message}`);
    }
}

exports.addSupportResponseService= async(messageId,supportResponse)=>{
    try {
        const updateMessage = await Message.findByIdAndUpdate(
            messageId,
           {
                $push: { supportResponse: {text:supportResponse} },
                status:"responded",
                updatedAt:Date.now(),
           },
            {new: true,runValidators:true}
        );
        return updateMessage;
    } catch (error) {
        throw new Error(`Error adding support response: ${error.message}`);
    }
}
