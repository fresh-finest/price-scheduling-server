const { getAllSellerService } = require("../service/sellerService");
const { isEligibleForFreeTrial, createFreeTrialService, createPaidSubscriptionService, getSubscriptionBySellerService, cancelSubscriptionService, updateSubscriptionStatusService } = require("../service/subscriptionService");


exports.createFreeTrial = async(req,res)=>{
    try {
        const {sellerId} = req.body;
        if(!sellerId){
            return res.status(400).json({error:"Seller ID is required"});
        }

        const isEligible = await isEligibleForFreeTrial(sellerId);
        if(!isEligible){
            return res.status(400).json({error:'Seller is not eligible for a free trial.'});
        }
        const subscription = await createFreeTrialService(sellerId);
        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.createPaidSubscription = async(req,res)=>{
    try {
        const {sellerId,amount,durationInDays} = req.body;

        if(!sellerId || !amount || !durationInDays){
            return res.status(400).json({error:"sellerId,amount,durationsInDays are required"})
        }
        const subscription = await createPaidSubscriptionService(sellerId, amount, durationInDays);
        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({
            error:error.message
        })
    }
}

exports.getAllSubscriber = async(req,res)=>{
    try {
        const subscription = await getAllSellerService();

        res.status(200).json(subscription);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}
exports.getSubscriptionBySeller= async(req,res)=>{
    try {
        const {sellerId} = req.params;

        const subscription = await getSubscriptionBySellerService(sellerId);

        res.status(200).json(subscription);
        
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}


exports.cancelSubscription=async(req,res)=>{
    try {
        const {subscriptionId} = req.params;
        const subscription = await cancelSubscriptionService(subscriptionId);
        if(!subscription){
            return res.status(404).json({error:"Subscription not found"});
        }
        res.status(200).json(subscription);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.updateSubscriptionStatus = async (req, res) => {
    try {
      const { subscriptionId } = req.params; 
      const { status } = req.body;
  
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
  
      const subscription = await updateSubscriptionStatusService(subscriptionId, status);
  
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
  
      res.status(200).json({ subscription });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };