const mongoose = require("mongoose");
const { autoJobsAgenda } = require("../Agenda");
const { getListingsItemBySku } = require("../../service/getPriceService");
const AddPoduct = require("../../model/AddProduct");
const fetchSalesMetricsByDay = require("../../service/getReportService");

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
  targetQuantity,
  ruleId
) => {
  console.log(percentage, amount, type);
  console.log(targetQuantity);
  const metrics = await fetchSalesMetricsByDay(sku,"sku")
  const quantity = metrics[metrics.length - 1].unitCount;
  console.log("quantity: " + quantity);
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

  // Rule
  if (type === "random") {
    console.log("random");
   
    if (amount !== undefined && amount !== null) {
      const randomAmount = (Math.random() * 2 - 1) * parseFloat(amount);
      newPrice = lastPrice + randomAmount;
      if (newPrice > maxPrice) {
       
        newPrice = parseFloat(maxPrice);
       
      } else if (newPrice < minPrice) {
       
        newPrice = parseFloat(minPrice);
       
      }
    } else if (percentage !== undefined && percentage !== null) {
      const randomPercentage = (Math.random() * 2 - 1) * parseFloat(percentage);
    
      const priceChange = lastPrice * randomPercentage;
      console.log(randomPercentage, priceChange);
      newPrice = lastPrice + priceChange;
      if (newPrice > maxPrice) {
        
        newPrice = parseFloat(maxPrice);
       
      } else if (newPrice < minPrice) {
        
        newPrice = parseFloat(minPrice);
        
      }
    }
  } else if (type === "increasing") {
    console.log("increasing type");
    if (priceAmount) {
      console.log("amount");
      newPrice = lastPrice + parseFloat(amount);
      console.log("last and new price: " + lastPrice, newPrice, amount);
      if (newPrice > maxPrice) {
      
        newPrice = parseFloat(maxPrice);
        await cancelAutoJobs(sku);
      }
    } else {
      newPrice = lastPrice + priceDifference * parseFloat(percentage);
      console.log("last and new price: " + lastPrice, newPrice);
      if (newPrice > maxPrice) {
       
        newPrice = parseFloat(maxPrice);
        await cancelAutoJobs(sku);
      }
    }
  } else if (type === "decreasing") {
    console.log("decreasing");

    if (priceAmount) {
      newPrice = lastPrice - parseFloat(amount);
      if (newPrice < minPrice) {
       
        newPrice = parseFloat(minPrice);
        await cancelAutoJobs(sku);
      }
    } else {
      newPrice = lastPrice - priceDifference * parseFloat(percentage);
      if (newPrice < minPrice) {
       
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
     
        newPrice = parseFloat(minPrice);
     
      }
    } else {
      newPrice = lastPrice + priceDifference * parseFloat(percentage);
      console.log(newPrice);
      console.log("last and new price: " + lastPrice, newPrice);
      if (newPrice > maxPrice) {
        
        newPrice = parseFloat(minPrice);
      
      }
    }
  } else if (type === "decreasingRepeat") {
    console.log("decreasing");

    if (priceAmount) {
      newPrice = lastPrice - parseFloat(amount);
      if (newPrice < minPrice) {
       
        newPrice = parseFloat(maxPrice);
        
      }
    } else {
      newPrice = lastPrice - priceDifference * parseFloat(percentage);
      if (newPrice < minPrice) {
    
        newPrice = parseFloat(maxPrice);
        console.log(newPrice);
      
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
  }else if(type === "quantity-cycling"){
    if(quantity >= targetQuantity){
      newPrice = parseFloat(maxPrice);
     console.log("quantity is greater than",targetQuantity);
    }else{
      console.log("quantity is less than",targetQuantity);
      newPrice = parseFloat(minPrice);
    }
  }

  skuState.lastPrice = parseFloat(newPrice);
  skuState.isIncreasing = isIncreasing;
  await skuState.save();

  return parseFloat(newPrice).toFixed(2);
};

const cancelAutoJobs = async (sku) => {
 try {
  await autoJobsAgenda.cancel({ "data.sku": sku });

  const updatedProduct = await  AddPoduct.findOneAndUpdate(
    {sku},
    {status:"Inactive"},
    {new:true}
  )
  if(!updatedProduct){
    console.log(`No product found with SKU : ${sku}`);
  }else{
    console.log(`Product SKU: ${sku} status updated to inactive`);
  }
 } catch (error) {
  console.error("Error cancelling auto jobs and updated status:", error);
 }
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
