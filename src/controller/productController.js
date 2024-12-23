const SaleStock = require("../model/SaleStock");
const { searchBySkuAsinService, getProductByFbaFbmService, filterProductBySaleUnitWithDay, filterProductByStock,filterBySkuAndStatus,filterSortAndPaginateSaleStock, filteProductService } = require("../service/productService");


// exports.getLimitProduct = async(req,res)=>{
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     console.log(page);
//     const skip  = (page-1)*limit;
//     console.log(skip);

//     const totalProducts = await SaleStock.countDocuments();
//     const products = await SaleStock.find().skip(skip).limit(limit);
//     res.json({totalProducts,products});
// }
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

        
        const totalProducts = await SaleStock.countDocuments();

        console.log(totalProducts);
        
        const products = await SaleStock.find()
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
        const limit = parseInt(req.query.limit, 10) || 20;

        console.log(uid);
        let result;
        if (uid.startsWith("B0") && uid.length === 10) {
            result = await searchBySkuAsinService(null, uid, page, limit);
        } else {
            result = await searchBySkuAsinService(uid, null, page, limit);
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



exports.getFilteredSortedAndPaginatedSaleStock = async (req, res) => {
    try {
        const { sortOrder = "asc", page = 1, limit = 20 } = req.query;

        // Call the service to get sorted and paginated SaleStock data
        const result = await filterSortAndPaginateSaleStock(
            sortOrder.toLowerCase(),
            parseInt(page, 10),
            parseInt(limit, 10)
        );

        res.status(200).json({
            status: "Success",
            message: "Filtered, sorted, and paginated SaleStock data retrieved successfully.",
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
            message: "An error occurred while retrieving SaleStock data.",
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
        message: "Filtered and paginated SaleStock data retrieved successfully.",
        
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
        message: "Error occurred while retrieving filtered SaleStock data.",
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
  
      // Combine all filters and fetch results
      const result = await filteProductService(
        {
          fulfillmentChannel,
          stockCondition: parsedStockCondition,
          salesCondition: parsedSalesCondition,
          uid
        },
        parseInt(page, 10),
        parseInt(limit, 10)
      );
  
      res.status(200).json({
        status: "Success",
        message: "Filtered and paginated SaleStock data retrieved successfully.",
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
        message: "Error occurred while retrieving filtered SaleStock data.",
        error: error.message,
      });
    }
  };
  