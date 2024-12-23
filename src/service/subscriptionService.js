const Ownernotification = require("../model/Ownernotification");
const Subscription = require("../model/Subscription");

exports.createFreeTrialService = async(sellerId)=>{
    const currentDate = new Date();
    const trialEndDate = new Date(currentDate);
    trialEndDate.setDate(currentDate.getDate()+7);

    const subscription = new Subscription({
        sellerId:sellerId,
        startDate: currentDate,
        endDate:trialEndDate,
        paymentDueDate:trialEndDate,
        trial:true,
        status:'active',
    })

    const savedSubscription = await subscription.save();

    const notification =  new Ownernotification({
        type:'new_subscription',
        message:`Free trial subscription created for seller ID: ${sellerId}`,
        receiver:'ownertoxx@priceobo.com'
    })

    await notification.save();

    return savedSubscription;
}

exports.createPaidSubscriptionService = async(sellerId,amount,durationDays)=>{
    const currentDate = new Date();
    const endDate = new Date(currentDate);
    endDate.setDate(currentDate.getDate()+durationDays);

    const subscription = new Subscription({
        sellerId,
        startDate:currentDate,
        endDate,
        amount,
        paymentDueDate:endDate,
        trial:false,
        // status
    })
    const savedSubscription = await subscription.save();
    const notification =  new Ownernotification({
        type:'new_subscription',
        message:`Paid subscription created for seller ID: ${sellerId}`,
        receiver:'ownertoxx@priceobo.com'
    })

    await notification.save();

    return savedSubscription;
}

exports.isEligibleForFreeTrial = async(sellerId)=>{
    const existingSubscriptions = await Subscription.find({sellerId});
    return existingSubscriptions.length === 0;
}

exports.getAllSubscriberService=async()=>{
    const result = await Subscription.find();
    return result;
}

exports.getSubscriptionBySellerService= async(sellerId)=>{
    const result = await Subscription.find({sellerId});
    return result;
}

exports.cancelSubscriptionService=async(subscriptionId)=>{
    const notification =  new Ownernotification({
        type:'new_subscription',
        message:`Free trial subscription created for seller ID: ${sellerId}`,
        receiver:'ownertoxx@priceobo.com'
    })

    await notification.save();

    return Subscription.findByIdAndUpdate(
        subscriptionId,
        {status:'cancelled'},
        {new:true}
    )
}

exports.updateSubscriptionStatusService = async(subscriptionId,status)=>{
    return Subscription.findByIdAndUpdate(
        subscriptionId,
        {status},
        {new: true, runValidators:true}
    )
}