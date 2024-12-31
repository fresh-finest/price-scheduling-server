const mongoose = require("mongoose");

const skuStateSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  lastPrice: { type: Number, required: true },
});

const SkuState = mongoose.model("Skustate", skuStateSchema);

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
  let skuState = await SkuState.findOne({ sku });
  if (!skuState) {
    if (type === "increasing") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(minPrice) });
    } else if (type === "decreasing") {
      skuState = new SkuState({ sku, lastPrice: parseFloat(maxPrice) });
    }
    await skuState.save();
  }

  let lastPrice = skuState.lastPrice;

  let newPrice;

  if (type === "random") {
    console.log("random");
    newPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
  } else if (type === "increasing") {
    if (priceAmount) {
      console.log("amount");
      newPrice = lastPrice + parseFloat(amount);
      console.log("last and new price: " + lastPrice, newPrice, amount);
      if (newPrice > maxPrice) {
        newPrice = parseFloat(minPrice) + parseFloat(amount);
      }
    } else {
      newPrice = lastPrice + priceDifference * parseFloat(percentage);
      console.log("last and new price: " + lastPrice , newPrice);
      if (newPrice > maxPrice) {
        newPrice = parseFloat(minPrice) + priceDifference * parseFloat(percentage);
      }
    }
  } else if (type === "decreasing") {
    console.log("decreasing");

    if (priceAmount) {
      newPrice = lastPrice - parseFloat(amount);
      if (newPrice < minPrice) {
        newPrice = maxPrice - parseFloat(amount);
      }
    } else {
      newPrice = lastPrice - priceDifference * parseFloat(percentage);
      if (newPrice < minPrice) {
        newPrice = maxPrice - priceDifference * parseFloat(percentage);
      }
    }
  }

  skuState.lastPrice = parseFloat(newPrice);
  await skuState.save();

  return parseFloat(newPrice).toFixed(2);
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
