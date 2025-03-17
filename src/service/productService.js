const moment = require("moment-timezone");
const PriceSchedule = require("../model/PriceSchedule");
const Product = require("../model/Product");

const ProductGroup = require("../model/ProductGroup");

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
  let products = await Product.find(query).skip(skip).limit(limit);

  // Get the total count of matching products
  let totalResults = await Product.countDocuments(query);

  if (totalResults === 0) {
    searchQuery = { itemName: { $regex: sku, $options: "i" } };
    products = await Product.find(searchQuery).skip(skip).limit(limit);
    totalResults = await Product.countDocuments(searchQuery);
  }

  return {
    products,
    totalResults,
  };
};
*/

exports.searchBySkuAsinService = async (sku, asin, page = 1, limit = 100) => {
  console.log("search asin sku");

  const query = {};
  const skip = (page - 1) * limit;

  if (asin) {
    // Search by ASIN only
    query.asin1 = { $regex: asin, $options: "i" };
  } else if (sku) {
    // Search by SKU or itemName
    query.$or = [
      { sellerSku: { $regex: sku, $options: "i" } },
      { itemName: { $regex: sku, $options: "i" } }
    ];
  }

  // Fetch products with pagination
  const products = await Product.find(query).skip(skip).limit(limit);

  // Get the total count of matching products
  const totalResults = await Product.countDocuments(query);

  return {
    products,
    totalResults,
  };
};

// exports.getProductByFbaFbmService = async(type)=>{
//     const products = await Product.find({fulfillmentChannel:type});
//     return products;
// }

exports.getProductByFbaFbmService = async (type, page = 1, limit = 20) => {
  const query = { fulfillmentChannel: type };
  console.log(type);
  const skip = (page - 1) * limit;
  const products = await Product.find(query).skip(skip).limit(limit);
  const totalResults = await Product.countDocuments(query);
  return {
    products,
    totalResults,
    currentPage: page,
    totalPages: Math.ceil(totalResults / limit),
  };
};


exports.filterProductBySaleUnitWithDay = async (
  dayFilter,
  unitCondition,
  userInput,
  page = 1,
  limit = 20
) => {
  try {
    // Fetch all products
    const products = await Product.find();
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


exports.filterProductByStock = async (
  stockCondition,
  userInput,
  page = 1,
  limit = 20
) => {
  try {
    // Fetch all products from the database

    console.log(stockCondition, userInput);
    const products = await Product.find();

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

    // Fetch and filter Product data based on valid SKUs
    const filteredProduct = await Product.find({
      sellerSku: { $in: validSkus }, // Match SKUs with validPriceSchedules
    });

    // Apply pagination to the filtered results
    const totalResults = filteredProduct.length;
    const paginatedData = filteredProduct.slice(
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
      "Error while filtering and paginating Product data: " + error.message
    );
  }
};

exports.filterSortAndPaginateProduct = async (
  sortOrder = "asc",
  page = 1,
  limit = 20
) => {
  try {
    // Fetch all Product data
    // const saleStockData = await Product.find();
    const saleStockData = await Product.find();

    // Calculate productStock and sort by it
    const sortedProduct = saleStockData
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
    const totalResults = sortedProduct.length;
    const paginatedData = sortedProduct.slice(
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
      "Error while filtering, sorting, and paginating Product data: " +
        error.message
    );
  }
};

exports.filteProductService = async (
  { fulfillmentChannel, stockCondition, salesCondition, uid, tags },
  page = 1,
  limit = 50
) => {
  console.log(tags);
  try {
    const skip = (page - 1) * limit;

    let query = {};

    // Fulfillment Channel filter
    if (fulfillmentChannel) {
      query.fulfillmentChannel =
        fulfillmentChannel === "AMAZON_NA" ? { $ne: "DEFAULT" } : "DEFAULT";
    }

    let isAsin = false;

    if (uid && uid.startsWith("B0") && uid.length === 10) {
      isAsin = true;
      query.asin1 = { $regex: uid, $options: "i" };
    }
    
    if (!isAsin && uid) {
      query.$or = [
        { sellerSku: { $regex: uid, $options: "i" } },
        { itemName: { $regex: uid, $options: "i" } }
      ];
    }
    

    if (tags && tags.length > 0) {
      query["tags.tag"] = { $in: tags };
    }

    // Initial DB fetch
    let saleStockData = await Product.find(query);

    const applyFilters = (data) => {
      return data.filter((product) => {
        const productStock =
          (product.fulfillableQuantity || 0) +
          (product.pendingTransshipmentQuantity || 0) +
          (product.quantity || 0);

        const matchesStock = !stockCondition || (() => {
          switch (stockCondition.condition) {
            case ">": return productStock > stockCondition.value;
            case "<": return productStock < stockCondition.value;
            case "==": return productStock === stockCondition.value;
            case ">=": return productStock >= stockCondition.value;
            case "<=": return productStock <= stockCondition.value;
            case "!=": return productStock !== stockCondition.value;
            case "blank": return productStock === 0;
            case "notblank": return productStock !== 0;
            case "between":
              return (
                productStock >= stockCondition.value[0] &&
                productStock <= stockCondition.value[1]
              );
            default: return true;
          }
        })();

        const matchesSales = !salesCondition || (() => {
          const matchingMetric = product.salesMetrics.find(
            (metric) => metric.time === salesCondition.time
          );
          if (!matchingMetric) return false;

          const totalUnits = matchingMetric.totalUnits;
          switch (salesCondition.condition) {
            case ">": return totalUnits > salesCondition.value;
            case "<": return totalUnits < salesCondition.value;
            case "==": return totalUnits === salesCondition.value;
            case ">=": return totalUnits >= salesCondition.value;
            case "<=": return totalUnits <= salesCondition.value;
            case "!=": return totalUnits !== salesCondition.value;
            case "blank": return totalUnits === 0;
            case "notblank": return totalUnits !== 0;
            case "between":
              return (
                totalUnits >= salesCondition.value[0] &&
                totalUnits <= salesCondition.value[1]
              );
            default: return true;
          }
        })();

        return matchesStock && matchesSales;
      });
    };

    saleStockData = applyFilters(saleStockData);
    let totalResults = saleStockData.length;
    console.log("Total results before fallback:", totalResults);

    // Apply pagination after filtering
    const paginatedData = saleStockData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error(
      "Error while filtering and paginating Product: " + error.message
    );
  }
};


/*
exports.filteProductService = async (
  { fulfillmentChannel, stockCondition, salesCondition, uid, tags },
  page = 1,
  limit = 50
) => {
  console.log(tags);
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

    if (tags && tags.length > 0) {
      query["tags.tag"] = { $in: tags };
    }

    // Fetch initial matching products from the database
    let saleStockData = await Product.find(query);

    // Function to apply all filtering conditions
    const applyFilters = (data) => {
      return data.filter((product) => {
        const productStock =
          (product.fulfillableQuantity || 0) +
          (product.pendingTransshipmentQuantity || 0) +
          (product.quantity || 0);

        const matchesStock = !stockCondition || (() => {
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
        })();

        const matchesSales = !salesCondition || (() => {
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
        })();

        return matchesStock && matchesSales;
      });
    };

    // Apply all filters to initial search
    saleStockData = applyFilters(saleStockData);

    // Total results after filtering
    let totalResults = saleStockData.length;
    console.log("Total results before itemName search:", totalResults);

    // If no results found, attempt to search by itemName as a fallback
    if (totalResults === 0 && sku) {
      let searchQuery = { itemName: { $regex: sku, $options: "i" } };

      // Fetch all matching products by itemName
      let fallbackResults = await Product.find(searchQuery);

      // Apply all filters to itemName search results
      fallbackResults = applyFilters(fallbackResults);

      // Update total results after filtering
      totalResults = fallbackResults.length;

      // Apply pagination AFTER filtering
      saleStockData = fallbackResults.slice(skip, skip + limit);
    } else {
      // Apply pagination to original filtered results
      saleStockData = saleStockData.slice(skip, skip + limit);
    }

    console.log("Final total results:", totalResults);

    // Return paginated results
    return {
      data: saleStockData,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    };
  } catch (error) {
    throw new Error(
      "Error while filtering and paginating Product: " + error.message
    );
  }
};


*/
exports.updateProductToFovouriteService = async(sellerSku,isFavourite)=>{
  try {
    const updateFavourite = await Product.findOneAndUpdate(
      {sellerSku},
      {isFavourite},
      {new:true}
    )
    return updateFavourite;
  } catch (error) {
    throw new Error(error.message);
  }
}

exports.updateProductToHideService = async(sellerSku,isHide)=>{
  try {
    const updateHide = await Product.findOneAndUpdate(
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
      let saleStockData = await Product.find(query);
  
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
        "Error while filtering and paginating Product: " + error.message
      );
    }
  };
  */
  exports.updateTagService = async (sellerSku, tags) => {
    try {
      const updatedTag = await Product.findOneAndUpdate(
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
      const updatedStock = await Product.findOneAndUpdate(
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
  


  exports.updateGroupService = async (sellerSku, groupName) => {
    try {
      // Extract the name from the groupName array
      const name = groupName[0]?.name;
      if (!name) {
        throw new Error("Name is required.");
      }
  
      const skusToUpdate = Array.isArray(sellerSku)
      ? sellerSku.map((sku) => ({ sku })) // Map each SKU string to an object
      : [{ sku: sellerSku }]; // Wrap single SKU string in an object

    // Update the ProductGroup with the skus and group name
    await ProductGroup.findOneAndUpdate(
      { name }, // Match the document by name
      { $addToSet: { skus: { $each: skusToUpdate } } }, // Add skus as objects dynamically
      { new: true, upsert: true } // Create if not exists
    );

      const updateGroup = await Product.findOneAndUpdate(
        { sellerSku }, // Match by sellerSku
        { $set: { groupName } }, // Set the groupName field
        { new: true, upsert: true } // Create if not exists
      );
  
      return updateGroup;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  
  

  exports.deleteGroupService = async(sellerSku,group)=>{
    try {
      const updateGroup = await Product.findOneAndUpdate(
        {sellerSku},
        {
          $pull : {groupName:{group}}
        },
        {new:true}
      )
      return updateGroup;
    } catch (error) {
      throw new Error(error);
    }
  }


