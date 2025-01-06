const { ErrorReply } = require("redis");
const SaleStock = require("../model/SaleStock");

exports.getLimitProductService = async (page, limit) => {
  const skip = (page - 1) * limit;
  const products = await SaleStock.find().skip(skip).limit(limit);
  const total = await SaleStock.countDocuments;
  return products, total;
};

// exports.searchBySkuAsinService = async(sku,asin)=>{
//     console.log("search asin sku");
//     const query={};
//     if (sku) {
//         query.sellerSku = { $regex: sku, $options: "i" };
//     }
//     if (asin) {
//         query.asin1 = { $regex: asin, $options: "i" };
//     }
//     const products = await SaleStock.find(query);
//     return products;
// }

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
  let products = await SaleStock.find(query).skip(skip).limit(limit);

  // Get the total count of matching products
  let totalResults = await SaleStock.countDocuments(query);

  if (totalResults === 0) {
    searchQuery = { itemName: { $regex: sku, $options: "i" } };
    products = await SaleStock.find(searchQuery).skip(skip).limit(limit);
    totalResults = await SaleStock.countDocuments(searchQuery);
  }

  return {
    products,
    totalResults,
  };
};

// exports.getProductByFbaFbmService = async(type)=>{
//     const products = await SaleStock.find({fulfillmentChannel:type});
//     return products;
// }

exports.getProductByFbaFbmService = async (type, page = 1, limit = 20) => {
  const query = { fulfillmentChannel: type };
  console.log(type);
  const skip = (page - 1) * limit;
  const products = await SaleStock.find(query).skip(skip).limit(limit);
  const totalResults = await SaleStock.countDocuments(query);
  return {
    products,
    totalResults,
    currentPage: page,
    totalPages: Math.ceil(totalResults / limit),
  };
};

// exports.filterProductBySaleUnitWithDay = async(dayFilter,unitCondition,userInput)=>{
//  try {
//     const products = await SaleStock.find();

//     return products.map(product=>{
//         const filteredMetrics = product.salesMetrics.filter(metric => dayFilter.includes(metric.time));

//         const compareMetrics = filteredMetrics.filter(metric=>{
//             switch(unitCondition){
//                 case ">":
//                     return metric.totalUnits > userInput;
//                 case "<":
//                     return metric.totalUnits < userInput;
//                 case "==":
//                     return metric.totalUnits === userInput;
//                 default:
//                     throw new Error("Invalid condition");
//             }
//         });
//         return {...product._doc,salesMetrics:compareMetrics};
//     }).filter(product=>product.salesMetrics.length > 0);
//  } catch (error) {
//     throw new Error("error on filtering",error.message)
//  }
// }
exports.filterProductBySaleUnitWithDay = async (
  dayFilter,
  unitCondition,
  userInput,
  page = 1,
  limit = 20
) => {
  try {
    // Fetch all products
    const products = await SaleStock.find();
    console.log(userInput, unitCondition, dayFilter);
    // Filter and process products
    const filteredProducts = products
      .map((product) => {
        const filteredMetrics = product.salesMetrics.filter((metric) =>
          dayFilter.includes(metric.time)
        );

        const compareMetrics = filteredMetrics.filter((metric) => {
          switch (unitCondition) {
            case ">":
              return metric.totalUnits > userInput;
            case "<":
              return metric.totalUnits < userInput;
            case "==":
              return metric.totalUnits === userInput;
            default:
              throw new Error("Invalid condition");
          }
        });

        return { ...product._doc, salesMetrics: compareMetrics };
      })
      .filter((product) => product.salesMetrics.length > 0); // Keep only products with matching salesMetrics

    // Apply pagination to the filtered results
    const totalResults = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(
      (page - 1) * limit,
      page * limit
    );

    return {
      filteredProducts: paginatedProducts,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error("Error on filtering: " + error.message);
  }
};

// exports.filterProductByStock = async(stockCondition,userInput)=>{
//     try {
//         const products = await SaleStock.find();

//         const filterProducts = products.filter(product =>{
//             const productStock= (product.fulfillableQuantity || 0) + (product.pendingTransshipmentQuantity || 0) + (product.quantity || 0);

//             switch(stockCondition){
//                 case ">":
//                     return productStock > userInput;
//                 case "<":
//                     return productStock < userInput;
//                 case "==":
//                     return productStock === userInput;
//                 default:
//                     throw new error("Invalid conditions")
//             }
//         })
//     return filterProducts;
//     } catch (error) {
//         throw new error("Error for filtering products.",error.message)
//     }
// }

exports.filterProductByStock = async (
  stockCondition,
  userInput,
  page = 1,
  limit = 20
) => {
  try {
    // Fetch all products from the database

    console.log(stockCondition, userInput);
    const products = await SaleStock.find();

    // Filter products based on stockCondition
    const filteredProducts = products.filter((product) => {
      const productStock =
        (product.fulfillableQuantity || 0) +
        (product.pendingTransshipmentQuantity || 0) +
        (product.quantity || 0);

      switch (stockCondition) {
        case ">":
          return productStock > userInput;
        case "<":
          return productStock < userInput;
        case "==":
          return productStock === userInput;
        default:
          throw new Error("Invalid condition");
      }
    });

    // Apply pagination to the filtered results
    const totalResults = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(
      (page - 1) * limit,
      page * limit
    );

    return {
      filteredProducts: paginatedProducts,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error("Error filtering products: " + error.message);
  }
};

const moment = require("moment-timezone");
const PriceSchedule = require("../model/PriceSchedule");

exports.filterBySkuAndStatus = async (page = 1, limit = 20) => {
  console.log("filter schedule data");
  try {
    // const currentDate = moment().tz("America/New_York").toISOString();
    let currentDate = moment().tz("America/New_York").toISOString();
    currentDate = moment(currentDate).subtract(24, "hours").toISOString();

    // Fetch all valid price schedules
    const validPriceSchedules = await PriceSchedule.find({
      status: { $ne: "deleted" },
      $or: [
        { weekly: true },
        { monthly: true },
        { endDate: { $gte: currentDate } },
      ],
    });

    // Extract SKUs from valid price schedules
    const validSkus = validPriceSchedules.map((schedule) => schedule.sku);

    // Fetch and filter SaleStock data based on valid SKUs
    const filteredSaleStock = await SaleStock.find({
      sellerSku: { $in: validSkus }, // Match SKUs with validPriceSchedules
    });

    // Apply pagination to the filtered results
    const totalResults = filteredSaleStock.length;
    const paginatedData = filteredSaleStock.slice(
      (page - 1) * limit,
      page * limit
    );

    // Return paginated results with metadata
    return {
      data: paginatedData,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error(
      "Error while filtering and paginating SaleStock data: " + error.message
    );
  }
};

exports.filterSortAndPaginateSaleStock = async (
  sortOrder = "asc",
  page = 1,
  limit = 20
) => {
  try {
    // Fetch all SaleStock data
    const saleStockData = await SaleStock.find();

    // Calculate productStock and sort by it
    const sortedSaleStock = saleStockData
      .map((product) => {
        const productStock =
          (product.fulfillableQuantity || 0) +
          (product.pendingTransshipmentQuantity || 0) +
          (product.quantity || 0);

        return { ...product._doc, productStock }; // Add calculated stock to the product
      })
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.productStock - b.productStock; // Ascending order
        } else {
          return b.productStock - a.productStock; // Descending order
        }
      });

    // Apply pagination to the sorted results
    const totalResults = sortedSaleStock.length;
    const paginatedData = sortedSaleStock.slice(
      (page - 1) * limit,
      page * limit
    );

    // Return paginated results with metadata
    return {
      data: paginatedData,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error(
      "Error while filtering, sorting, and paginating SaleStock data: " +
        error.message
    );
  }
};

exports.filteProductService = async (
  { fulfillmentChannel, stockCondition, salesCondition, uid, tag },
  page = 1,
  limit = 50
) => {
  try {
    const skip = (page - 1) * limit;

    // Build the query object
    let query = {};

    // Apply fulfillmentChannel filter (FBA/FBM)
    if (fulfillmentChannel) {
      query.fulfillmentChannel =
        fulfillmentChannel === "AMAZON_NA" ? { $ne: "DEFAULT" } : "DEFAULT";
    }
    let sku = null;
    let asin = null;
    if (uid !== undefined) {
      if (uid.startsWith("B0") && uid.length === 10) {
        asin = uid;
      } else {
        sku = uid;
      }
    }
    // Apply SKU/ASIN filters
    if (sku) {
      query.sellerSku = { $regex: sku, $options: "i" };
    }
    if (asin) {
      query.asin1 = { $regex: asin, $options: "i" };
    }
    if (tag) {
      query.tag = { $regex: tag, $options: "i" };
    }
    // Fetch initial matching products from the database
    let saleStockData = await SaleStock.find(query);

    // Filter by stock condition
    if (stockCondition) {
      saleStockData = saleStockData.filter((product) => {
        const productStock =
          (product.fulfillableQuantity || 0) +
          (product.pendingTransshipmentQuantity || 0) +
          (product.quantity || 0);

        switch (stockCondition.condition) {
          case ">":
            return productStock > stockCondition.value;
          case "<":
            return productStock < stockCondition.value;
          case "==":
            return productStock === stockCondition.value;
          case ">=":
            return productStock >= stockCondition.value;
          case "<=":
            return productStock <= stockCondition.value;
          case "!=":
            return productStock !== stockCondition.value;
          case "blank":
            return productStock === 0;
          case "notblank":
            return productStock !== 0;
          case "between":
            return (
              productStock >= stockCondition.value[0] &&
              productStock <= stockCondition.value[1]
            );
          default:
            return true;
        }
      });
    }

    // Filter by sales metrics
    if (salesCondition) {
      saleStockData = saleStockData.filter((product) => {
        const matchingMetric = product.salesMetrics.find(
          (metric) => metric.time === salesCondition.time
        );

        if (!matchingMetric) return false;

        const totalUnits = matchingMetric.totalUnits;
        switch (salesCondition.condition) {
          case ">":
            return totalUnits > salesCondition.value;
          case "<":
            return totalUnits < salesCondition.value;
          case "==":
            return totalUnits === salesCondition.value;
          case ">=":
            return totalUnits >= salesCondition.value;
          case "<=":
            return totalUnits <= salesCondition.value;
          case "!=":
            return totalUnits !== salesCondition.value;
          case "blank":
            return totalUnits === 0;
          case "notblank":
            return totalUnits !== 0;
          case "between":
            return (
              totalUnits >= salesCondition.value[0] &&
              totalUnits <= salesCondition.value[1]
            );
          default:
            return true;
        }
      });
    }

    // Total results after filtering
    const totalResults = saleStockData.length;

    // Paginate results
    const paginatedData = saleStockData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error(
      "Error while filtering and paginating SaleStock: " + error.message
    );
  }
};

/*
  exports.filteProductService = async (
    { fulfillmentChannel, stockCondition, salesCondition, uid},
    page = 1,
    limit = 20
  ) => {
    try {
      const skip = (page - 1) * limit;
  
      // Build the query object
      let query = {};
  
      // Apply fulfillmentChannel filter (FBA/FBM)
      if (fulfillmentChannel) {
        query.fulfillmentChannel =
          fulfillmentChannel === "AMAZON_NA" ? { $ne: "DEFAULT" } : "DEFAULT";
      }
      let sku=null; let asin=null;
      if(uid!==undefined){
        if (uid.startsWith("B0") && uid.length === 10) {
          asin= uid;
    } else{
      sku=uid;
    }
      }
      // Apply SKU/ASIN filters
      console.log(sku);
      if (sku) {
        query.sellerSku = { $regex: sku, $options: "i" };
      }
      if (asin) {
        query.asin1 = { $regex: asin, $options: "i" };
      }
  
      // Fetch initial matching products from the database
      let saleStockData = await SaleStock.find(query);
  
      // Filter by stock condition
      if (stockCondition) {
        saleStockData = saleStockData.filter((product) => {
          const productStock =
            (product.fulfillableQuantity || 0) +
            (product.pendingTransshipmentQuantity || 0) +
            (product.quantity || 0);
  
          switch (stockCondition.condition) {
            case ">":
              return productStock > stockCondition.value;
            case "<":
              return productStock < stockCondition.value;
            case "==":
              return productStock === stockCondition.value;
            case "between":
              return (
                productStock >= stockCondition.value[0] &&
                productStock <= stockCondition.value[1]
              );
            default:
              return true;
          }
        });
      }
  
      // Filter by sales metrics
      if (salesCondition) {
        saleStockData = saleStockData.filter((product) => {
          const matchingMetric = product.salesMetrics.find(
            (metric) => metric.time === salesCondition.time
          );
  
          if (!matchingMetric) return false;
  
          const totalUnits = matchingMetric.totalUnits;
          switch (salesCondition.condition) {
            case ">":
              return totalUnits > salesCondition.value;
            case "<":
              return totalUnits < salesCondition.value;
            case "==":
              return totalUnits === salesCondition.value;
            case "between":
              return (
                totalUnits >= salesCondition.value[0] &&
                totalUnits <= salesCondition.value[1]
              );
            default:
              return true;
          }
        });
      }
  
      // Total results after filtering
      const totalResults = saleStockData.length;
    console.log(query);
      // Paginate results
      const paginatedData = saleStockData.slice(skip, skip + limit);
  
      return {
        data: paginatedData,
        totalResults,
        currentPage: page,
        totalPages: Math.ceil(totalResults / limit),
      };
    } catch (error) {
      throw new Error(
        "Error while filtering and paginating SaleStock: " + error.message
      );
    }
  };
  */
  exports.updateTagService = async (sellerSku, tags) => {
    try {
      const updatedTag = await SaleStock.findOneAndUpdate(
        { sellerSku }, 
        { $set: { tags } }, 
        { new: true, upsert: true } 
      );
      return updatedTag;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  
  exports.deleteTagService = async (sellerSku, tag, colorCode) => {
    try {
      const updatedStock = await SaleStock.findOneAndUpdate(
        { sellerSku },
        {
          $pull: { tags: { tag, colorCode } }, 
        },
        { new: true }
      );
      return updatedStock;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  

  
