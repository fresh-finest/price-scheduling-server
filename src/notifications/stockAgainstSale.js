const axios = require("axios");
const Notification = require("../model/Notification");

const checkStockVsSales = async()=>{
    console.log("check stock vs sale ")
    try {
        const response = await axios.get(`http://api.priceobo.com/fetch-all-listings`);
        const listings = response.data.listings;

        for(listing of listings){
            const stock = listing.fullfillableQuantity + listing.pendingTransshipmentQuantity;
            const sale30Days = listing.saleMetrics.find((metric)=>metric.time === "30 D").totalUnits;

            if(stock > sale30Days){
                const existingNotification = await Notification.findOne({
                    message:`Stock is greater than last 30 days sales for ${listing.sellerSku} stock - ${stock}  sale- ${sale30Days}`
                })
            }

        if(!existingNotification){
            const notification = new Notification({
                 message:`Stock is greater than last 30 days sales for ${listing.sellerSku} stock - ${stock}  sale- ${sale30Days}`
            })

            await notification.save();
        }
    }
    } catch (error) {
        console.error("Error checking stock vs. sales:", error);
    }
}

module.exports = {checkStockVsSales};