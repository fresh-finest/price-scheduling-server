const SaleReport = require("../model/SaleReport");



exports.updateIsFavouriteService = async(sellerSku,isFavourite)=>{
    try {
        const updateFavourite = await SaleReport.findOneAndUpdate(
            {sellerSku},
            {isFavourite},
            {new:true}
        )
        return updateFavourite;
    } catch (error) {
        throw new Error(error.message);
    }
}

exports.updateIsHideService = async(sellerSku,isHide)=>{
    try {
        const updateHide = await SaleReport.findOneAndUpdate(
            {sellerSku},
            {isHide},
            {new:true}
        )
        return updateHide;
    } catch (error) {
        throw new Error(error.message); 
    }
}
/*
exports.searchBySkuAsinService = async (sku, asin, page = 1, limit = 100) => {
  console.log("search asin sku");
  const query = {};
  if (sku) {
    query.sellerSku = { $regex: sku, $options: "i" };
  }
  if (asin) {
    query.asin1 = { $regex: asin, $options: "i" };
  }

  const skip = (page - 1) * limit;

  // Fetch products with pagination
  let products = await SaleReport.find(query).skip(skip).limit(limit);

  // Get the total count of matching products
  let totalResults = await SaleReport.countDocuments(query);

  if (totalResults === 0) {
    searchQuery = { itemName: { $regex: sku, $options: "i" } };
    products = await SaleReport.find(searchQuery).skip(skip).limit(limit);
    totalResults = await SaleReport.countDocuments(searchQuery);
  }

  return {
    products,
    totalResults,
  };
};
*/

exports.searchBySkuAsinService = async (sku, asin, page = 1, limit = 50) => {
  console.log("search asin sku");

  const query = {};
  const skip = (page - 1) * limit;
 
  if (asin) {
     asin = asin.replace(/^\s+/, "");
    query.asin1 = { $regex: asin, $options: "i" };
  } else if (sku) {
    // Search by SKU or itemName
    // sku = sku.replace(/^\s+/, "");
    query.$or = [
      { sellerSku: { $regex: sku, $options: "i" } },
      { itemName: { $regex: sku, $options: "i" } }
    ];
  }

  // Fetch products with pagination
  const products = await SaleReport.find(query).skip(skip).limit(limit);

  // Get the total count of matching products
  const totalResults = await SaleReport.countDocuments(query);

  return {
    products,
    totalResults,
  };
};