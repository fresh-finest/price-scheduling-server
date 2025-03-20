const Inventory = require("../model/Inventory");
const Product = require("../model/Product");
const { fetchSaeMetricsForSkus } = require("../service/getComparisionSaleService");
const { searchBySkuAsinService, getProductByFbaFbmService, filterProductBySaleUnitWithDay, filterProductByStock,filterBySkuAndStatus,filterSortAndPaginateProduct, filteProductService, updateTagService, deleteTagService, updateGroupService, deleteGroupService, updateProductToFovouriteService, updateProductToHideService } = require("../service/productService");





const mapInventoryToProduct = async (inventories) => {
  const existingProducts = await Product.find();

  // Separate new products and updates
  const updates = [];
  const newProducts = inventories.filter(item => {
      const existingProduct = existingProducts.find(
          product => product.sellerSku === item.sellerSku
      );

      if (existingProduct) {
          // If product exists, prepare update
          updates.push({
              updateOne: {
                  filter: { sellerSku: item.sellerSku },
                  update: { $set: { price: item.price, quantity: item.quantity } },
              },
          });
          return false; // Skip adding as a new product
      }

      return true; // Add as a new product
  }).map(item => ({
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      sellerSku: item.sellerSku,
      price: item.price,
      quantity: item.quantity,
      asin1: item.asin1,
      fulfillmentChannel: item.fulfillmentChannel,
      status: item.status,
  }));

  return { newProducts, updates };
};

exports.loadInventoryToProduct = async () => {
  try {
      const inventories = await Inventory.find();
      const { newProducts, updates } = await mapInventoryToProduct(inventories);

      // Insert new products
      if (newProducts.length > 0) {
          await Product.insertMany(newProducts);
          console.log(`${newProducts.length} new products added.`);
      } else {
          console.log("No new products to add.");
      }

      // Update existing products
      if (updates.length > 0) {
          await Product.bulkWrite(updates);
          console.log(`${updates.length} products updated.`);
      } else {
          console.log("No products to update.");
      }

      return { newProducts, updatedCount: updates.length };
  } catch (error) {
      console.error("Error loading Inventory to Products:", error);
      throw error;
  }
};


// exports.getLimitProduct = async(req,res)=>{
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     console.log(page);
//     const skip  = (page-1)*limit;
//     console.log(skip);

//     const totalProducts = await Product.countDocuments();
//     const products = await Product.find().skip(skip).limit(limit);
//     res.json({totalProducts,products});
// }
/*
exports.getSalesComparision = async(req,res)=>{
    try {
        const {startDate,endDate, page=1,limit=20} = req.query;
      
        console.log(req.query + " " + startDate + " " + endDate + " " + page + " " + limit);
        if(!startDate || !endDate){
            return res.status(400).json({
                status:"Failed",
                message:"Missing required query parameters"
            })
        }

        const skip = (page-1)*limit;

        const skus = await Product.find({}, { sellerSku: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean();

        const skuList = skus.map((item)=>item.sellerSku);

        metrics = await fetchSaeMetricsForSkus(skuList,startDate,endDate);

        res.status(200).json({
            status:"Success",
            message:"Sales comparison data fetched successfully",
            data:metrics
        })

    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message:"An error occured",
            error:error.message
        })
    }
}
*/

exports.getSalesComparision = async (req, res) => {
    try {
      const { startDate, endDate,  skus } = req.query;

      console.log(startDate + " " + endDate + " " + skus);
    //   let startDateObj = new Date(startDate);
    //   startDateObj.setDate(startDateObj.getDate() - 1);
    //   const decreasedDate = startDateObj.toISOString().split('T')[0];
      // Validate required parameters
      if (!startDate || !endDate) {
        return res.status(400).json({
          status: "Failed",
          message: "Missing required query parameters: startDate and endDate",
        });
      }
  
      let skuList = [];
  
      // If SKUs are provided, parse them
      if (skus) {
        skuList = Array.isArray(skus) ? skus : skus.split(",");
      } else {
       res.status(400).json({error:"No sku found"});
      }
  
      // Ensure SKU list is not empty
      if (skuList.length === 0) {
        return res.status(404).json({
          status: "Failed",
          message: "No SKUs available for sales comparison",
        });
      }
  
      // Fetch sales metrics for the SKUs
      const metrics = await fetchSaeMetricsForSkus(skuList, startDate, endDate);
      console.log(metrics);
      res.status(200).json({
        status: "Success",
        message: "Sales comparison data fetched successfully",
        data: metrics,
      });
    } catch (error) {
      res.status(500).json({
        status: "Failed",
        message: "An error occurred",
        error: error.message,
      });
    }
  };
  
exports.getLimitProduct = async (req, res) => {
    console.log("get limit hit")
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        if (page < 1 || limit < 1) {
            return res.status(400).json({
                status: "Failed",
                message: "Page and limit values must be greater than 0."
            });
        }

     
        const skip = (page - 1) * limit;

        
        const totalProducts = await Product.countDocuments();

        console.log(totalProducts);
        
        const products = await Product.find()
            .sort({isFavourite:-1,isHide:1})
            .skip(skip)
            .limit(limit);

       
        console.log(products.length)
        if (products.length === 0) {
            return res.status(404).json({
                status: "Failed",
                message: "No products found for the given page and limit."
            });
        }
       console.log(page);
     
        res.status(200).json({
            status: "Success",
            message: "Successfully fetched products.",
           data:{
            totalProducts:totalProducts,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            listings:products,
           }
        });
    } catch (error) {
       
        console.error("Error fetching paginated products:", error.message);
        res.status(500).json({
            status: "Failed",
            message: "An error occurred while fetching products.",
            error: error.message,
        });
    }
};


// exports.searchProductsByAsinSku = async(req,res,next)=>{
//     try {
//         const {uid} = req.params;
//         console.log(uid);
//         let result;
//         if(uid.startsWith("B0") && uid.length === 10){
//             result = await searchBySkuAsinService(null,uid);
//         }else{
//             result = await searchBySkuAsinService(uid,null);
//         }
        
      
//         res.status(200).json({
//             status:"Success",
//             message:"Successfully searched productes",
//             result
//         })
//     } catch (error) {
//         res.status(400).json({
//             status:"Failed",
//             message:"Failed to searched products.",
//             error:error.message
//         })
//     }
// }

exports.searchProductsByAsinSku = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        let keyword =  uid ? uid.replace(/^\s+/, "") : "";
        
        let result;
        if (keyword.startsWith("B0") && keyword.length === 10) {
            result = await searchBySkuAsinService(null, keyword, page, limit);
        } else {
            result = await searchBySkuAsinService(keyword, null, page, limit);
        }

        const { products, totalResults } = result;

        res.status(200).json({
            status: "Success",
            message: "Successfully searched products",
            data: {
                totalProducts:totalResults,
                currentPage: page,
                totalPages: Math.ceil(totalResults / limit),
                listings:products,
            },
        });
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: "Failed to search products.",
            error: error.message,
        });
    }
};

// exports.getProductByFbaFbm = async(req,res,next)=>{
//     try {
//         const {type} = req.params;
//         console.log(type);
//         const products = await getProductByFbaFbmService(type);
//         res.status(200).json({
//             status:"Success",
//             message:"Successfully get productes",
//             products
//         })
//     } catch (error) {
//         res.status(400).json({
//             status:"Failed",
//             message:"Failed to get products.",
//             error:error.message
//         })
//     }
// }

exports.getProductByFbaFbm = async(req,res,next)=>{
    try {
        const {type} = req.params;
        const {page=1,limit=20} = req.query;

        const result = await getProductByFbaFbmService(type,parseInt(page),parseInt(limit));

        res.status(200).json({
            status:"Success",
            message:"Successfully get data",
            data:{               
                totalProducts: result.totalResults,
                currentPage:result.currentPage,
                totalPages: result.totalPages,
                listings: result.products,
            }
        })
    } catch (error) {
        res.status(400).json({
            status:"Failed",
            message:"Failed to fetch products.",
            error:error.message
        })
    }
}

// exports.getFilteredByMetrics = async(req,res,next)=>{
//     try {
//         const {days,condition,units} = req.query;

//         if(!days || !condition || units === undefined){
//             return res.status(400).json({
//                 status:"Failed",
//                 message:"Missing required query"
//             })
//         }
//         const dayFilter = days.split(",");
//         const unitCondition = condition;
//         const userInput = parseInt(units,10);

//         if(isNaN(userInput)){
//             return res.status(400).json({
//                 status:"Failed",
//                 message:"units much a valid numer"
//             })
//         }

//         const filteredProducts = await filterProductBySaleUnitWithDay(dayFilter,unitCondition,userInput);
        
        
//         res.status(200).json({
//             status:"Success",
//             message:"Filtered sales metrics retrieved",
//             data:filteredProducts
//         })
//     } catch (error) {
//         res.status(500).json({
//             status:"Failed",
//             message:"An error occured.",
//             error:error.message
//         })
//     }
// }

exports.getFilteredByMetrics = async (req, res, next) => {
    try {
        const { days, condition, units, page = 1, limit = 20 } = req.query;

        // Validate required query parameters
        if (!days || !condition || units === undefined) {
            return res.status(400).json({
                status: "Failed",
                message: "Missing required query parameters",
            });
        }

        const dayFilter = days.split(",");
        const unitCondition = condition;
        const userInput = parseInt(units, 10);

        if (isNaN(userInput)) {
            return res.status(400).json({
                status: "Failed",
                message: "Units must be a valid number.",
            });
        }

        // Parse pagination parameters
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);

        // Call the service to filter products with pagination
        const result = await filterProductBySaleUnitWithDay(
            dayFilter,
            unitCondition,
            userInput,
            parsedPage,
            parsedLimit
        );

        res.status(200).json({
            status: "Success",
            message: "Filtered sales metrics retrieved successfully.",
            data: {
                totalProducts: result.totalResults,
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                listings:result.filteredProducts,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: "Failed",
            message: "An error occurred.",
            error: error.message,
        });
    }
};


// exports.getFilteredByStock = async(req,res,next)=>{
//     try {
//         const {condition,stock} = req.query;

//         if(!condition || stock===undefined){
//             return res.status(400).json({
//                 status:"Failed",
//                 message:"Missing required parameter"
//             })
//         }

//         const stockCondition = condition;
//         const userInput = parseInt(stock,10);

//         if(isNaN(userInput)){
//             return res.status(400).json({
//                 status:"Failed",
//                 message:"Stock must be a valid number"
//             })
//         }

//         const filteredProducts = await filterProductByStock(stockCondition,userInput);

//         res.status(200).json({
//             status:"Success",
//             message:"Filtered by stock is successfully completed",
//             filteredProducts
//         })


//     } catch (error) {
//         res.status(500).json({
//             status:"Failed",
//             message:"An error occrued",
//             error:error.message
//         })
//     }
// }

exports.getFilteredByStock = async (req, res, next) => {
    try {
        const { condition, stock, page = 1, limit = 20 } = req.query;

        // Validate required parameters
        if (!condition || stock === undefined) {
            return res.status(400).json({
                status: "Failed",
                message: "Missing required parameters",
            });
        }

        const stockCondition = condition;
        const userInput = parseInt(stock, 10);

        if (isNaN(userInput)) {
            return res.status(400).json({
                status: "Failed",
                message: "Stock must be a valid number",
            });
        }

        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);

        // Call the service to filter products with pagination
        const result = await filterProductByStock(stockCondition, userInput, parsedPage, parsedLimit);

        res.status(200).json({
            status: "Success",
            message: "Filtered products by stock successfully retrieved",
            data: {
                totalProducts: result.totalResults,
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                listings:result.filteredProducts,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: "Failed",
            message: "An error occurred",
            error: error.message,
        });
    }
};


exports.getFilteredSchedulesAndStocks = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query; 

        
        const result = await filterBySkuAndStatus(parseInt(page, 10), parseInt(limit, 10));
        
        res.status(200).json({
            status: "Success",
            message: "Filtered schedules and stocks retrieved successfully.",         
               data: {
                totalProducts: result.totalResults,
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                listings:result.data
            },
        });
    } catch (error) {
        res.status(500).json({
            status: "Failed",
            message: "An error occurred while retrieving data.",
            error: error.message,
        });
    }
};



exports.getFilteredSortedAndPaginatedProduct = async (req, res) => {
    try {
        const { sortOrder = "asc", page = 1, limit = 20 } = req.query;

        // Call the service to get sorted and paginated Product data
        const result = await filterSortAndPaginateProduct(
            sortOrder.toLowerCase(),
            parseInt(page, 10),
            parseInt(limit, 10)
        );

        res.status(200).json({
            status: "Success",
            message: "Filtered, sorted, and paginated Product data retrieved successfully.",
            data: result.data,
            data:{
                totalProducts: result.totalResults,
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                listings:result.data
            },
        });
    } catch (error) {
        res.status(500).json({
            status: "Failed",
            message: "An error occurred while retrieving Product data.",
            error: error.message,
        });
    }
};
/*
exports.getFilteredProduct = async (req, res) => {
    try {
      const { fulfillmentChannel, stockCondition, salesCondition, page = 1, limit = 20 } = req.query;
       console.log("hit on merge filter");
      // Parse stock and sales conditions if provided
      const parsedStockCondition = stockCondition
        ? JSON.parse(stockCondition) // { condition: '<', value: 100 } or { condition: 'between', value: [100, 200] }
        : null;
  
      const parsedSalesCondition = salesCondition
        ? JSON.parse(salesCondition) // { time: '7 D', condition: '>', value: 100 }
        : null;
  
      const result = await filteProductService(
        { fulfillmentChannel, stockCondition: parsedStockCondition, salesCondition: parsedSalesCondition },
        parseInt(page, 10),
        parseInt(limit, 10)
      );
  
      res.status(200).json({
        status: "Success",
        message: "Filtered and paginated Product data retrieved successfully.",
        
        metadata: {
          totalProducts: result.totalResults,
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          listings: result.data,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "Failed",
        message: "Error occurred while retrieving filtered Product data.",
        error: error.message,
      });
    }
  };
  */

  exports.getFilteredProduct = async (req, res) => {
    try {
      const {
        fulfillmentChannel,
        stockCondition,
        salesCondition,
        uid,
        tags,
        page = 1,
        limit = 50,
      } = req.query;
  
      
      // Parse stock and sales conditions if provided
      const parsedStockCondition = stockCondition
        ? JSON.parse(stockCondition)
        : null; // { condition: '<', value: 100 } or { condition: 'between', value: [100, 200] }
  
      const parsedSalesCondition = salesCondition
        ? JSON.parse(salesCondition)
        : null; // { time: '7 D', condition: '>', value: 100 }
  
        const parsedTags = tags ? tags.split(",") : [];
         
 
        // uid =  uid.replace(/^\s+/, "");
      // Combine all filters and fetch results
      const result = await filteProductService(
        {
          fulfillmentChannel,
          stockCondition: parsedStockCondition,
          salesCondition: parsedSalesCondition,
          uid,
          tags:parsedTags
        },
        parseInt(page, 10),
        parseInt(limit, 10)
      );
  
      res.status(200).json({
        status: "Success",
        message: "Filtered and paginated Product data retrieved successfully.",
        metadata: {
          totalProducts: result.totalResults,
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          listings: result.data,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "Failed",
        message: "Error occurred while retrieving filtered Product data.",
        error: error.message,
      });
    }
  };
  
  exports.updateProductToFavoutire = async(req,res,next)=>{
    const {sku} = req.params;
    const {isFavourite}= req.body;
    try {
      const result = await updateProductToFovouriteService(sku,isFavourite);

      res.status(200).json({result});
      
    } catch (error) {
      next (error)
    }
  }

  exports.updateProductToHide = async(req,res,next)=>{
    const {sku} = req.params;
    const {isHide} = req.body;

    try {
      const result = await updateProductToHideService(sku,isHide);
      res.status(200).json({result});
    } catch (error) {
      next(error);
    }
  }
  exports.updateTag = async (req, res) => {
    const { sku } = req.params;
    console.log(sku);
    const { tags} = req.body;
    console.log(req.body);
    try {
      const product = await Product.findOne({sellerSku:sku});
      // console.log(product)
      if(!product || product===null || product === undefined){
      return res.status(404).json({message:"Product not found!"})
      }
      const updatedTag = await updateTagService(sku, tags);
      res.status(200).json({
        status: "Success",
        message: "Tag updated successfully",
        data: updatedTag,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  exports.deleteTag = async (req, res) => {
    const { sku } = req.params;
    const { tag, colorCode } = req.body;
  
    try {
      const updatedStock = await deleteTagService(sku, tag, colorCode);
      if (!updatedStock) {
        return res.status(404).json({ message: "Item not found or tag not present" });
      }
      res.status(200).json({
        status: "Success",
        message: "Tag deleted successfully",
        data: updatedStock,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  exports.updateGroup= async(req,res,next)=>{
    const {sku} = req.params;
    const {groupName} = req.body;
    try {
      const result = await updateGroupService(sku,groupName);
      res.status(200).json({result});
    } catch (error) {
      next(error);
    }
  }

exports.deleteGroup= async(req,res,next)=>{
  const {sku} = req.params;
  const {name} = req.body;
  try {
    await deleteGroupService(sku,name);
    res.status(200).json({message:"Successfully delted group"});
  } catch (error) {
    next(error);
  }
}

  exports.getSingleProduct = async(req,res)=>{
    const {sku} = req.params;
    try {
        const result = await Product.findOne({sellerSku:sku})
        res.status(200).json({
            result
        })
        } catch (error) {
        res.status(500).json({error:error.message})
    }
  }
  