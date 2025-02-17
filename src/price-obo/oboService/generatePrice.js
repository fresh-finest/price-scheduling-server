const mongoose = require("mongoose");
const { autoJobsAgenda } = require("../Agenda");
const { getListingsItemBySku } = require("../../service/getPriceService");

const skuStateSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  lastPrice: { type: Number, required: true },
  isIncreasing:{type:Boolean, default:false}
});

const SkuState = mongoose.model("Skustate", skuStateSchema);

exports.deletePriceState = async (sku) => {
  if (!sku) {
    throw new Error("Sku is required to delete");
  }
  try {
    const result = await SkuState.findOneAndDelete({ sku });
    if (!result) {
      return { message: `No document found with SKU: ${sku}` };
    }
    return {
      message: `Document with SKU: ${sku} deleted successfully`,
      deletedDocument: result,
    };
  } catch (error) {
    console.error("Error deleting document:", error);
    throw new Error("Failed to delete the document.");
  }
};
//type= random, increasing, decreasing, increasingdecreasing
const generatePrice = async (
  sku,
  maxPrice,
  minPrice,
  percentage,
  amount,
  type,
  ruleId
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
  // console.log(price);
  let skuState = await SkuState.findOne({ sku });
  if (!skuState) {
    if (type === "increasing" || type === "increasingRepeat" || type === "increasing-cycling") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(minPrice) });
    } else if (type === "decreasing" || type === "decreasingRepeat" || type === "decreasing-cycling") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(maxPrice) });
    } else if (type === "random") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(price) });
    }
    await skuState.save();
  }

  let lastPrice = parseFloat(skuState.lastPrice);
  let isIncreasing = skuState.isIncreasing;
  let newPrice;

  if (type === "random") {
    console.log("random");

    // for random type changing the similar amount of price for each sku under one rule

    const randomSeed = getRandomSeedForRule(ruleId);
    /*
    if(amount !== undefined && amount !== null){
      const randomAmount = (randomSeed)*parseFloat(amount);
      newPrice = lastPrice + randomAmount;
      if(newPrice > maxPrice){

      }
      if(newPrice < minPrice){

      }
    }
    else if(percentage !== undefined && percentage !== null){
      const randomPercentage = (randomSeed)*parseFloat(percentage);
      const priceChange = lastPrice*randomPercentage;
      newPrice = lastPrice + priceChange;
      if(newPrice > maxPrice){

      }
      if(newPrice < minPrice){

      }
    }


*/

    // newPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
    if (amount !== undefined && amount !== null) {
      const randomAmount = (Math.random() * 2 - 1) * parseFloat(amount);
      newPrice = lastPrice + randomAmount;
      if (newPrice > maxPrice) {
        // newPrice = parseFloat(price);
        newPrice = parseFloat(maxPrice);
        //await cancelAutoJobs(sku);
      } else if (newPrice < minPrice) {
        // newPrice = parseFloat(price);
        newPrice = parseFloat(minPrice);
        //await cancelAutoJobs(sku);
      }
    } else if (percentage !== undefined && percentage !== null) {
      const randomPercentage = (Math.random() * 2 - 1) * parseFloat(percentage);
      // const priceChange = lastPrice*(randomPercentage/100);
      const priceChange = lastPrice * randomPercentage;
      console.log(randomPercentage, priceChange);
      newPrice = lastPrice + priceChange;
      if (newPrice > maxPrice) {
        // newPrice = parseFloat(price);
        newPrice = parseFloat(maxPrice);
        // await cancelAutoJobs(sku);
      } else if (newPrice < minPrice) {
        // newPrice = parseFloat(price);
        newPrice = parseFloat(minPrice);
        // await cancelAutoJobs(sku);
      }
    }
  } else if (type === "increasing") {
    console.log("increasing type");
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
      console.log("last and new price: " + lastPrice, newPrice);
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
  } else if (type === "increasingRepeat") {
    if (priceAmount) {
      console.log("amount");
      newPrice = lastPrice + parseFloat(amount);
      console.log("last and new price: " + lastPrice, newPrice, amount);
      if (newPrice > maxPrice) {
        // newPrice = parseFloat(minPrice) + parseFloat(amount);
        newPrice = parseFloat(minPrice);
        // newPrice = parseFloat(maxPrice);
        // await cancelAutoJobs(sku);
      }
    } else {
      newPrice = lastPrice + priceDifference * parseFloat(percentage);
      console.log(newPrice);
      console.log("last and new price: " + lastPrice, newPrice);
      if (newPrice > maxPrice) {
        // newPrice = parseFloat(minPrice) + priceDifference * parseFloat(percentage);
        newPrice = parseFloat(minPrice);
        // newPrice = parseFloat(maxPrice);
        // await cancelAutoJobs(sku);
      }
    }
  } else if (type === "decreasingRepeat") {
    console.log("decreasing");

    if (priceAmount) {
      newPrice = lastPrice - parseFloat(amount);
      if (newPrice < minPrice) {
        // newPrice = maxPrice - parseFloat(amount);
        newPrice = parseFloat(maxPrice);
        // newPrice = parseFloat(minPrice);
        // await cancelAutoJobs(sku);
      }
    } else {
      newPrice = lastPrice - priceDifference * parseFloat(percentage);
      if (newPrice < minPrice) {
        // newPrice = maxPrice - priceDifference * parseFloat(percentage);
        newPrice = parseFloat(maxPrice);
        console.log(newPrice);
        // newPrice = parseFloat(minPrice);
        // await cancelAutoJobs(sku);
      }
    }
  } else if (type === "increasing-cycling") {
    
    if (isIncreasing) {
      newPrice =
        lastPrice +
        (priceDifference * parseFloat(percentage) || parseFloat(amount));
        console.log("new price: "+newPrice);
      if (newPrice > maxPrice) {
        newPrice = maxPrice;
        isIncreasing = false;
      }
    } else{
      newPrice =
        lastPrice -
        (priceDifference * parseFloat(percentage) || parseFloat(amount));
      if (newPrice < minPrice) {
        newPrice = minPrice;
        isIncreasing = true;
      }
    }
  }else if(type=== "decreasing-cycling"){
   
    if (isIncreasing) {
      newPrice =
        lastPrice -
        (priceDifference * parseFloat(percentage) || parseFloat(amount));
      if (newPrice < minPrice) {
        newPrice = minPrice;
        isIncreasing = false;
      }
    } else{
      newPrice =
        lastPrice +
        (priceDifference * parseFloat(percentage) || parseFloat(amount));
      if (newPrice > maxPrice) {
        newPrice = maxPrice;
        isIncreasing = true;
      }
    }
  }

  // else if(type === "buy-box"){
  //   checking "IsBuyBoxWinner": true,
  //   checking "IsFeaturedMerchant": false,
  //   dicreasing 
  // if checking isBuboxWinner is true then increase price
  // if isBuyBoxWinner is false and price is minimum then increase 50% of price difference
  // continue this process until isBuyBoxWinner is true

  skuState.lastPrice = parseFloat(newPrice);
  skuState.isIncreasing = isIncreasing;
  await skuState.save();

  return parseFloat(newPrice).toFixed(2);
};

const cancelAutoJobs = async (sku) => {
  await autoJobsAgenda.cancel({ "data.sku": sku });
};

const skuStateDelete = async (sku) => {
  await deletePriceState(sku);
};

// generatig random seed for each rule
const ruleRandomSeed = new Map();
const getRandomSeedForRule = (ruleId) => {
  if (!ruleRandomSeed.has(ruleId)) {
    ruleRandomSeed.set(ruleId, Math.random() * 2 - 1);
  }
  return ruleRandomSeed.get(ruleId);
};

module.exports = generatePrice;

// else if(type ==="increase-decrease"){
//     const unitCount = fetchUnitCount(sku,startDateTime,EndDatetime);
//     if(unitCount >=1){
//         generatePrice(maxPrice,minPrice,"decreasing");
//     }else {
//         generatePrice(maxPrice,minPrice,"increasing");
//     }
// }
