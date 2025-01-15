const mongoose = require("mongoose");
const { autoJobsAgenda } = require("../Agenda");
const { getListingsItemBySku } = require("../../service/getPriceService");

const skuStateSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  lastPrice: { type: Number, required: true },
});

const SkuState = mongoose.model("Skustate", skuStateSchema);

exports.deletePriceState=async(sku)=>{

  if(!sku){
    throw new Error("Sku is required to delete")
  }
  try {
    const result = await SkuState.findOneAndDelete({ sku });
    if (!result) {
      return { message: `No document found with SKU: ${sku}` };
    }
    return { message: `Document with SKU: ${sku} deleted successfully`, deletedDocument: result };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error('Failed to delete the document.');
  }
}
//type= random, increasing, decreasing, increasingdecreasing
const generatePrice = async (
  sku,
  maxPrice,
  minPrice,
  percentage,
  amount,
  type
) => {
  console.log(percentage, amount, type);
  let priceAmount = false;
  let priceDifference;
  if (amount === undefined || amount === null) {
    priceDifference = parseFloat(maxPrice) - parseFloat(minPrice);
  } else {
    priceDifference = amount;
    priceAmount = true;
  }
  console.log("Price difference: " + priceDifference);

  const listingData = await getListingsItemBySku(sku);
  const price = listingData.offerAmount;
  console.log(price);
  let skuState = await SkuState.findOne({ sku });
  if (!skuState) {
    if (type === "increasing") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(minPrice) });
    } else if (type === "decreasing") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(maxPrice) });
    } else if (type == "random"){
      skuState = new SkuState({ sku, lastPrice: parseFloat(price) });
    }
    await skuState.save();
  }

  let lastPrice = parseFloat(skuState.lastPrice);

  let newPrice;

  if (type === "random") {
    console.log("random");
    // newPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
    if(amount!==undefined && amount!==null){
      const randomAmount = (Math.random()*2 - 1)*parseFloat(amount);
      newPrice = lastPrice + randomAmount;
      if(newPrice>maxPrice){
        newPrice = parseFloat(price);
        //await cancelAutoJobs(sku);
      }else if(newPrice<minPrice){
        newPrice = parseFloat(price);
        //await cancelAutoJobs(sku);
      }
    }else if(percentage !== undefined && percentage !== null){
      const randomPercentage = (Math.random()*2-1)* parseFloat(percentage);
      const priceChange = lastPrice*(randomPercentage/100);
      newPrice = lastPrice + priceChange;
      if(newPrice>maxPrice){
        newPrice = parseFloat(price);
        // await cancelAutoJobs(sku);
      }else if(newPrice<minPrice){
        newPrice = parseFloat(price);
        // await cancelAutoJobs(sku);
      }
    }
  } else if (type === "increasing") {
    if (priceAmount) {
      console.log("amount");
      newPrice = lastPrice + parseFloat(amount);
      console.log("last and new price: " + lastPrice, newPrice, amount);
      if (newPrice > maxPrice) {
        // newPrice = parseFloat(minPrice) + parseFloat(amount);
        newPrice = parseFloat(maxPrice);
        await cancelAutoJobs(sku);
       
      }
    } else {
      newPrice = lastPrice + priceDifference * parseFloat(percentage);
      console.log("last and new price: " + lastPrice , newPrice);
      if (newPrice > maxPrice) {
        // newPrice = parseFloat(minPrice) + priceDifference * parseFloat(percentage);
        newPrice = parseFloat(maxPrice);
        await cancelAutoJobs(sku);

      }
    }
  } else if (type === "decreasing") {
    console.log("decreasing");

    if (priceAmount) {
      newPrice = lastPrice - parseFloat(amount);
      if (newPrice < minPrice) {
        // newPrice = maxPrice - parseFloat(amount);
        newPrice = parseFloat(minPrice);
        await cancelAutoJobs(sku);

      }
    } else {
      newPrice = lastPrice - priceDifference * parseFloat(percentage);
      if (newPrice < minPrice) {
        // newPrice = maxPrice - priceDifference * parseFloat(percentage);
        newPrice = parseFloat(minPrice);
        await cancelAutoJobs(sku);

      }
    }
  }

  skuState.lastPrice = parseFloat(newPrice);
  await skuState.save();

  return parseFloat(newPrice).toFixed(2);
};

const cancelAutoJobs = async(sku)=>{
  await autoJobsAgenda.cancel({'data.sku':sku});
}

const skuStateDelete = async(sku)=>{
  await deletePriceState(sku);
}

module.exports = generatePrice;

// else if(type ==="increase-decrease"){
//     const unitCount = fetchUnitCount(sku,startDateTime,EndDatetime);
//     if(unitCount >=1){
//         generatePrice(maxPrice,minPrice,"decreasing");
//     }else {
//         generatePrice(maxPrice,minPrice,"increasing");
//     }
// }
