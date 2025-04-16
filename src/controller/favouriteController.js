const { currentLineHeight, list } = require("pdfkit");
const Favourite = require("../model/Favourite");

const { updateIsFavouriteService, updateIsHideService, searchBySkuAsinService } = require("../service/favouriteService");
const SaleReport = require("../model/SaleReport");
const Product = require("../model/Product");
const AsinModeReport = require("../model/AsinModeReport");
const SkuModeReport = require("../model/SkuModeReport");

const mapSaleStockToFavourite = async (saleStock) => {
    // const existingFavourites = await Favourite.find();
    const existingFavourites = await SaleReport.find();
    
    const newFavourites = saleStock.filter(item =>
        !existingFavourites.some(fav => fav.sellerSku === item.sellerSku)
    ).map(item => ({
        itemName: item.itemName,
        sellerSku: item.sellerSku,
        price: item.price,
        asin1: item.asin1,
        imageUrl: item.imageUrl,
        fullfillmentChannel: item.fullfillmentChannel,
        status: item.status,
        fullfillableQuantity: item.fullfillableQuantity,
        pendingTransshipmentQuantity: item.pendingTransshipmentQuantity,
    }));

    return newFavourites;
};


exports.loadSaleStockToFavourite = async () => {
    try {
        const saleStock = await Product.find();
        const newFavourites = await mapSaleStockToFavourite(saleStock);

        if (newFavourites.length > 0) {
            await SaleReport.insertMany(newFavourites);
            console.log(`${newFavourites.length} new favourites added.`);
        } else {
            console.log("No new favourites to add.");
        }

        return newFavourites;
    } catch (error) {
        console.error("Error loading SaleStock to Favourite:", error);
        throw error;
    }
};

exports.getFavourites = async (req, res) => {

    console.log("Get favourites called");
    try {
        // const page = parseInt(req.query.page) || 1;
        // const limit = parseInt(req.query.limit) || 20;

        // if(page <1 || limit <1){
        //     return res.status(400).json({
        //         status:"Failed",
        //         message:"Invalid page or limit"
        //     })
        // }

        // const skip = (page - 1) * limit;

        const totalProducts = await Favourite.countDocuments();

        const products = await Favourite.find()
            .sort({isFavourite:-1,isHide:1});
            // .skip(skip)
            // .limit(limit);

        
        if(products.length === 0){
            return res.status(404).json({
                status:"Failed",
                message:"No products found"
            })
        }

        res.status(200).json({
            status: "Success",
            message:"Favourites retrieved successfully",
            data: {
                totalProducts: totalProducts,
                currentPage: page,
                totalPages: Math.ceil(totalProducts / limit),
                listings:products
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.loadReportSale = async (req, res) => {
    console.log("Load ReportSale called");
  
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
  
      if (page < 1 || limit < 1) {
        return res.status(400).json({
          status: "Failed",
          message: "Invalid page or limit",
        });
      }
  
      const skip = (page - 1) * limit;
  
      const totalProducts = await Product.countDocuments();
  
      const products = await Product.find()
        .sort({ isFavourite: -1, isHide: 1 });
        // .skip(skip)
        // .limit(limit);
  
      if (products.length === 0) {
        return res.status(404).json({
          status: "Failed",
          message: "No products found",
        });
      }
  
      // Load ReportSale with transformed data
      const bulkOperations = products.map((product) => ({
        updateOne: {
          filter: { sellerSku: product.sellerSku },
          update: {
            $set: {
              itemName: product.itemName,
              price: product.price,
              imageUrl: product.imageUrl,
              asin1: product.asin1,
              status: product.status,
              quantity: product.quantity,
              fulfillableQuantity: product.fulfillableQuantity,
              pendingTransshipmentQuantity: product.pendingTransshipmentQuantity,
              isFavourite: product.isFavourite,
              isHide: product.isHide,
            },
          },
          upsert: true, // Insert a new document if no match is found
        },
      }));
  
      // Execute bulk write
     const listing= await SaleReport.bulkWrite(bulkOperations);
  
      res.status(200).json({
        status: "Success",
        message: "ReportSale updated successfully",
        data: {
          totalProducts: totalProducts,
          currentPage: page,
          totalPages: Math.ceil(totalProducts / limit),
          listings:listing
        },
      });
    } catch (error) {
      console.error("Error loading ReportSale:", error.message);
      res.status(500).json({ message: error.message });
    }
  };

exports.getReport =async(req,res)=>{
    try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            // const limit= 2000;
            // const limit = 2000;
            console.log(page,limit);
            if(page <1 || limit <1){
                return res.status(400).json({
                    status:"Failed",
                    message:"Invalid page or limit"
                })
            }
    
            const skip = (page - 1) * limit;
    
            const totalProducts = await SaleReport.countDocuments();
    
            const products = await SaleReport.find()
                .sort({isFavourite:-1,isHide:1})
                .skip(skip)
                .limit(limit);
    
            
            if(products.length === 0){
                return res.status(404).json({
                    status:"Failed",
                    message:"No products found"
                })
            }
    
            res.status(200).json({
                status: "Success",
                message:"Favourites retrieved successfully",
                data: {
                    totalProducts: totalProducts,
                    currentPage: page,
                    totalPages: Math.ceil(totalProducts / limit),
                    listings:products
                }
            })
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


exports.getSaleBySku = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2300;
    const skip = (page - 1) * limit;

    const {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      sortByChange,
      sortOrder = "desc"
    } = req.query;

    console.log("Get Sale by SKU called", req.query);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const prevStart = new Date(prevStartDate);
    const prevEnd = new Date(prevEndDate);

    const pipeline = [
      { $match: { salesMetrics: { $exists: true, $ne: [] } } },

      // Filter only relevant salesMetrics
      {
        $addFields: {
          filteredSalesMetrics: {
            $filter: {
              input: "$salesMetrics",
              as: "metric",
          
              cond: {
                $or: [
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, start] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, end] }
                    ]
                  },
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, prevStart] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, prevEnd] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },

      // Final projection
      {
        $project: {
          sellerSku: 1,
          itemName: 1,
          price: 1,
          imageUrl: 1,
          status: 1,
          quantity: 1,
          isFavourite: 1,
          isHide: 1,
          asin1: 1,
          salesMetrics: "$filteredSalesMetrics"
        }
      }
    ];

    const rawResults = await SaleReport.aggregate(pipeline);

    // Calculate currentUnits, previousUnits, and percentageChange in JS per SKU
    const results = rawResults.map(item => {
      let currentUnits = 0;
      let previousUnits = 0;

      for (const metric of item.salesMetrics) {
        const [startStr, endStr] = metric.interval.split("--");
        const metricStart = new Date(startStr);
        const metricEnd = new Date(endStr);

        if (metricStart >= start && metricEnd <= end) {
          currentUnits += metric.units;
        } else if (metricStart >= prevStart && metricEnd <= prevEnd) {
          previousUnits += metric.units;
        }
      }

      let percentageChange = 0;

      if (previousUnits === 0 && currentUnits > 0) {
        percentageChange = 100;
      } else if (previousUnits === 0 && currentUnits === 0) {
        percentageChange = 0;
      } else if (currentUnits > previousUnits) {
        percentageChange = ((currentUnits - previousUnits) / currentUnits) * 100;
      } else {
        percentageChange = ((currentUnits - previousUnits) / previousUnits) * 100;
      }

      return {
        ...item,
        currentUnits,
        previousUnits,
        percentageChange: Math.round(percentageChange * 100) / 100
      };
    });

    // Sort in JS if needed
    if (sortByChange) {
      results.sort((a, b) => {
        return sortOrder === "asc"
          ? a.percentageChange - b.percentageChange
          : b.percentageChange - a.percentageChange;
      });
    }else {
      results.sort((a, b) => {
  
        if (a.isFavourite !== b.isFavourite) {
          return b.isFavourite - a.isFavourite;
        }
        
        return a.isHide - b.isHide;
      });
    }
    
    // await SkuModeReport.deleteMany(); 
    // await SkuModeReport.insertMany(results.map(({ _id,salesMetrics, ...rest }) => rest));

    const paginated = results.slice(skip, skip + limit);

    res.status(200).json({
      status: "Success",
      message: "SKU-based sales data retrieved",
      data: {
        totalProducts: results.length,
        currentPage: page,
        totalPages: Math.ceil(results.length / limit),
        listings: paginated
      }
    });

  } catch (error) {
    console.error("🔥 getSaleBySku failed:", error);
    res.status(500).json({
      status: "Error",
      message: "Server error while retrieving SKU sales",
      error: error.message
    });
  }
};




exports.getSaleByAsin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      sortByChange,
      sortOrder,
      unitsOperator,
      unitsValue,
      unitsValue2 // used for between
    } = req.query;

    console.log("Get Sale by ASIN called", req.query);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const prevStart = new Date(prevStartDate);
    const prevEnd = new Date(prevEndDate);

    const matchUnits = {};
    if (unitsOperator && unitsValue !== undefined) {
      const val = parseInt(unitsValue);
      const val2 = unitsValue2 ? parseInt(unitsValue2) : null;

      switch (unitsOperator) {
        case "=": matchUnits.$eq = val; break;
        case "!=": matchUnits.$ne = val; break;
        case ">": matchUnits.$gt = val; break;
        case "<": matchUnits.$lt = val; break;
        case ">=": matchUnits.$gte = val; break;
        case "<=": matchUnits.$lte = val; break;
        case "between":
          if (val2 !== null) {
            matchUnits.$gte = val;
            matchUnits.$lte = val2;
          }
          break;
        default: break;
      }
    }

    const pipeline = [
      { $match: { asin1: { $ne: null } } },
      {
        $addFields: {
          filteredSalesMetrics: {
            $filter: {
              input: "$salesMetrics",
              as: "metric",
              cond: {
                $or: [
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, new Date(startDate)] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, new Date(endDate)] }
                    ]
                  },
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, new Date(prevStartDate)] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, new Date(prevEndDate)] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      { $unwind: "$filteredSalesMetrics" },
      {
        $addFields: {
          metricStart: {
            $toDate: { $arrayElemAt: [{ $split: ["$filteredSalesMetrics.interval", "--"] }, 0] },
          },
          metricEnd: {
            $toDate: { $arrayElemAt: [{ $split: ["$filteredSalesMetrics.interval", "--"] }, 1] },
          },
        },
      },
      {
        $project: {
          asin1: 1,
          isFavourite: 1,
          isHide: 1,
          itemName: 1,
          sellerSku: 1,
          price: 1,
          imageUrl: 1,
          quantity: 1,
          status: 1,
          fulfillableQuantity: 1,
          pendingTransshipmentQuantity: 1,
          metricStart: 1,
          metricEnd: 1,
          salesMetric: "$filteredSalesMetrics",
          currentFlag: {
            $cond: [
              {
                $and: [
                  { $gte: ["$metricStart", start] },
                  { $lte: ["$metricEnd", end] }
                ]
              },
              true,
              false
            ]
          },
          previousFlag: {
            $cond: [
              {
                $and: [
                  { $gte: ["$metricStart", prevStart] },
                  { $lte: ["$metricEnd", prevEnd] }
                ]
              },
              true,
              false
            ]
          }
        }
      },
      {
        $group: {
          _id: "$asin1",
          doc: { $first: "$$ROOT" },
          currentUnits: {
            $sum: {
              $cond: ["$currentFlag", "$salesMetric.units", 0]
            }
          },
          previousUnits: {
            $sum: {
              $cond: ["$previousFlag", "$salesMetric.units", 0]
            }
          },
          salesMetrics: {
            $push: {
              $cond: [
                { $or: ["$currentFlag", "$previousFlag"] },
                "$salesMetric",
                "$$REMOVE"
              ]
            }
          }
        }
      },
      {
        $addFields: {
          percentageChange: {
            $cond: [
              { $eq: ["$previousUnits", "$currentUnits"] },
              0,
              {
                $cond: [
                  { $gt: ["$currentUnits", "$previousUnits"] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$currentUnits", "$previousUnits"] },
                          { $cond: [{ $eq: ["$currentUnits", 0] }, 1, "$currentUnits"] }
                        ]
                      },
                      100
                    ]
                  },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$currentUnits", "$previousUnits"] },
                          { $cond: [{ $eq: ["$previousUnits", 0] }, 1, "$previousUnits"] }
                        ]
                      },
                      100
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      ...(Object.keys(matchUnits).length > 0 ? [
        { $match: { currentUnits: matchUnits } }
      ] : []),
      {
        $sort: sortByChange ? {
          percentageChange: sortOrder === "asc" ? 1 : -1
        } : {
          "doc.isFavourite": -1,
          "doc.isHide": 1
        }
      },
      // { $skip: skip },
      // { $limit: limit },
      {
        $project: {
          asin1: "$_id",
          sellerSku: "$doc.sellerSku",
          itemName: "$doc.itemName",
          price: "$doc.price",
          imageUrl: "$doc.imageUrl",
          quantity: "$doc.quantity",
          status: "$doc.status",
          fulfillableQuantity: "$doc.fulfillableQuantity",
          pendingTransshipmentQuantity: "$doc.pendingTransshipmentQuantity",
          isFavourite: "$doc.isFavourite",
          isHide: "$doc.isHide",
          currentUnits: 1,
          previousUnits: 1,
          percentageChange: 1,
          salesMetrics: 1
        }
      }
    ];

    const listings = await SaleReport.aggregate(pipeline);
    const totalAsins = await SaleReport.distinct("asin1", { asin1: { $ne: null } });

    // await AsinModeReport.deleteMany(); 
    // await AsinModeReport.insertMany(listings.map(({ _id,salesMetrics, ...rest }) => rest));

    res.status(200).json({
      status: "Success",
      message: "ASIN metrics retrieved successfully",
      data: {
        totalProducts: listings.length,
        currentPage: page,
        totalPages: Math.ceil(totalAsins.length / limit),
        listings,
      },
    });
  } catch (error) {
    console.error("🔥 ASIN aggregation failed:", error);
    res.status(500).json({
      status: "Error",
      message: "Failed to retrieve ASIN metrics",
    });
  }
};







exports.calculateDifference = async(req,res)=>{
    try {
        
    } catch (error) {
        
    }
}

exports.updateIsFavourite = async(req,res)=>{
    const {sku} = req.params;
    const {isFavourite} = req.body;
    console.log(req.body);
    try {
        const updateFavourite = await updateIsFavouriteService(sku,isFavourite);
        res.status(200).json({
            status:"Success",
            message:"Favourite status updated successfully",
            data:updateFavourite
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



exports.updateIsHide = async(req,res)=>{
    const {sku} = req.params;
    const {isHide} = req.body;
    try {
        const updateHide = await updateIsHideService(sku,isHide);

        res.status(200).json({
            status:"Success",
            message:"Hide status updated successfully",
            data:updateHide
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.getReportBySku = async(req,res)=>{
    try {
        const {sku} = req.params;

        const result = await SaleReport.findOne({sellerSku:sku});
        if(!result){
            return res.status(404).json({
                status:"Failed",
                message:"No product found"
            })
        }

        res.status(200).json({
            status:"Success",
            message:"Product found",
            data:result
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


exports.searchProductsByAsinSku = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const {
      page = 1,
      limit = 100,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate
    } = req.query;

    console.log("Search sku mood Products by ASIN/SKU called", req.query);

    const skip = (page - 1) * limit;
    const keyword = uid ? uid.trim() : "";

    const start = new Date(startDate);
    const end = new Date(endDate);
    const prevStart = new Date(prevStartDate);
    const prevEnd = new Date(prevEndDate);

    let matchQuery;

    if (keyword.startsWith("B0") && keyword.length === 10) {
      matchQuery = { asin1: keyword };
    } else {
      matchQuery = {
        $or: keyword.split(/\s+/).flatMap((word) => [
          { sellerSku: { $regex: word, $options: "i" } },
          { itemName: { $regex: word, $options: "i" } },
          { asin1: { $regex: word, $options: "i" } }
        ])
      };
    }

    const pipeline = [
      { $match: matchQuery },
      { $unwind: "$salesMetrics" },
      {
        $addFields: {
          metricStart: {
            $toDate: { $arrayElemAt: [{ $split: ["$salesMetrics.interval", "--"] }, 0] }
          },
          metricEnd: {
            $toDate: { $arrayElemAt: [{ $split: ["$salesMetrics.interval", "--"] }, 1] }
          }
        }
      },
      {
        $project: {
          asin1: 1,
          sellerSku: 1,
          isFavourite: 1,
          isHide: 1,
          itemName: 1,
          price: 1,
          imageUrl: 1,
          quantity: 1,
          status: 1,
          fulfillableQuantity: 1,
          pendingTransshipmentQuantity: 1,
          salesMetric: "$salesMetrics",
          currentFlag: {
            $cond: [
              {
                $and: [
                  { $gte: ["$metricStart", start] },
                  { $lte: ["$metricEnd", end] }
                ]
              },
              true,
              false
            ]
          },
          previousFlag: {
            $cond: [
              {
                $and: [
                  { $gte: ["$metricStart", prevStart] },
                  { $lte: ["$metricEnd", prevEnd] }
                ]
              },
              true,
              false
            ]
          }
        }
      },
      {
        $group: {
          _id: "$sellerSku", // ✅ group by sellerSku (not asin1)
          doc: { $first: "$$ROOT" },
          currentUnits: {
            $sum: {
              $cond: ["$currentFlag", "$salesMetric.units", 0]
            }
          },
          previousUnits: {
            $sum: {
              $cond: ["$previousFlag", "$salesMetric.units", 0]
            }
          },
          salesMetrics: {
            $push: {
              $cond: [
                "$currentFlag",
                "$salesMetric",
                "$$REMOVE"
              ]
            }
          }
        }
      },
      {
        $addFields: {
          percentageChange: {
            $cond: [
              { $eq: ["$previousUnits", "$currentUnits"] },
              0,
              {
                $cond: [
                  { $gt: ["$currentUnits", "$previousUnits"] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$currentUnits", "$previousUnits"] },
                          { $cond: [{ $eq: ["$currentUnits", 0] }, 1, "$currentUnits"] }
                        ]
                      },
                      100
                    ]
                  },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$currentUnits", "$previousUnits"] },
                          { $cond: [{ $eq: ["$previousUnits", 0] }, 1, "$previousUnits"] }
                        ]
                      },
                      100
                    ]
                  }
                ]
              }
            ]
          },
        }
      },
      // { $skip: skip },
      // { $limit: parseInt(limit) },
      {
        $project: {
          _id: "$_id", // sellerSku
          asin1: "$doc.asin1",
          sellerSku: "$doc.sellerSku",
          itemName: "$doc.itemName",
          price: "$doc.price",
          imageUrl: "$doc.imageUrl",
          quantity: "$doc.quantity",
          status: "$doc.status",
          fulfillableQuantity: "$doc.fulfillableQuantity",
          pendingTransshipmentQuantity: "$doc.pendingTransshipmentQuantity",
          isFavourite: "$doc.isFavourite",
          isHide: "$doc.isHide",
          currentUnits: 1,
          previousUnits: 1,
          percentageChange: 1,
          salesMetrics: 1
        }
      }
    ];

    const listings = await SaleReport.aggregate(pipeline);
    const totalResults = listings.length;

    res.status(200).json({
      status: "Success",
      message: "SKU-based metrics retrieved successfully",
      data: {
        totalProducts: totalResults,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResults / limit),
        listings
      }
    });
  } catch (error) {
    console.error("🔥 Search ASIN/SKU failed:", error);
    res.status(400).json({
      status: "Failed",
      message: "Failed to search products.",
      error: error.message,
    });
  }
};



exports.getAsinSaleMetrics = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 2000;
      const skip = (page - 1) * limit;
  
      // Step 1: Find top-selling SKU per ASIN and sort favourites first
      const asinList = await SaleReport.aggregate([
        { $match: { asin1: { $ne: null } } },
        { $unwind: "$salesMetrics" },
        {
          $group: {
            _id: { asin1: "$asin1", sellerSku: "$sellerSku" },
            totalUnits: { $sum: "$salesMetrics.units" },
            doc: { $first: "$$ROOT" }, // Keep product info for this SKU
          },
        },
        {
          $sort: {
            "_id.asin1": 1,
            totalUnits: -1,
          },
        },
        {
          $group: {
            _id: "$_id.asin1", // Group by ASIN
            topSku: { $first: "$doc" },
            maxUnits: { $first: "$totalUnits" },
          },
        },
        {
          $sort: {
            "topSku.isFavourite": -1,
            "_id": 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]);
  
      const asinValues = asinList.map((item) => item._id);
  
      // Step 2: Merge sales metrics across all SKUs for each ASIN
      const salesMetricsData = await SaleReport.aggregate([
        { $match: { asin1: { $in: asinValues } } },
        { $unwind: "$salesMetrics" },
        {
          $group: {
            _id: {
              asin: "$asin1",
              interval: "$salesMetrics.interval",
            },
            totalUnits: { $sum: "$salesMetrics.units" },
            totalRevenue: {
              $sum: {
                $multiply: ["$salesMetrics.units", "$salesMetrics.price"],
              },
            },
          },
        },
        {
          $group: {
            _id: "$_id.asin",
            salesMetrics: {
              $push: {
                interval: "$_id.interval",
                units: "$totalUnits",
                price: {
                  $cond: [
                    { $eq: ["$totalUnits", 0] },
                    0,
                    { $round: [{ $divide: ["$totalRevenue", "$totalUnits"] }, 2] },
                  ],
                },
              },
            },
          },
        },
      ]);
  
      const salesMap = {};
      salesMetricsData.forEach((entry) => {
        salesMap[entry._id] = entry.salesMetrics;
      });
  
      // Step 3: Combine top product info + merged sales metrics
      const listings = asinList.map((item) => {
        const doc = item.topSku;
        return {
          _id: doc._id,
          asin1: doc.asin1,
          sellerSku: doc.sellerSku,
          itemName: doc.itemName,
          price: doc.price,
          imageUrl: doc.imageUrl,
          status: doc.status,
          quantity: doc.quantity,
          fulfillableQuantity: doc.fulfillableQuantity,
          pendingTransshipmentQuantity: doc.pendingTransshipmentQuantity,
          isFavourite: doc.isFavourite,
          isHide: doc.isHide,
          salesMetrics: salesMap[item._id] || [],
        };
      });
  
      // Step 4: Total ASIN count for pagination
      const totalAsins = await SaleReport.distinct("asin1", { asin1: { $ne: null } });
      const totalPages = Math.ceil(totalAsins.length / limit);
  
      res.status(200).json({
        status: "Success",
        message: "ASIN metrics retrieved successfully",
        data: {
          totalProducts: totalAsins.length,
          currentPage: page,
          totalPages,
          listings,
        },
      });
    } catch (error) {
      console.error("🔥 ASIN aggregation failed:", error);
      res.status(500).json({
        status: "Error",
        message: "Failed to retrieve ASIN metrics",
      });
    }
  };
  
  


  exports.searchAsinSaleMetrics = async (req, res) => {
    try {
      const { query } = req.params;
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        prevStartDate,
        prevEndDate
      } = req.query;
  
      console.log("Search asin mood ASIN metrics called", req.query);
      const skip = (page - 1) * limit;
  
      if (!query) {
        return res.status(400).json({
          status: "Error",
          message: "Missing search query.",
        });
      }
  
      const words = query.trim().split(/\s+/);
      const isAsin = /^B0[A-Z0-9]{8}$/.test(query.trim());
      const matchCondition = isAsin
        ? { asin1: query.trim() }
        : {
            $or: words.flatMap((word) => [
              { itemName: { $regex: word, $options: "i" } },
              { asin1: { $regex: word, $options: "i" } },
              { sellerSku: { $regex: word, $options: "i" } },
            ]),
          };
  
      const asinGroup = await SaleReport.aggregate([
        { $match: matchCondition },
        { $unwind: "$salesMetrics" },
        {
          $group: {
            _id: { asin1: "$asin1", sellerSku: "$sellerSku" },
            totalUnits: { $sum: "$salesMetrics.units" },
            doc: { $first: "$$ROOT" },
          },
        },
        {
          $sort: {
            "_id.asin1": 1,
            totalUnits: -1,
          },
        },
        {
          $group: {
            _id: "$_id.asin1",
            topSku: { $first: "$doc" },
          },
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);
  
      const asinList = asinGroup.map((item) => item._id);
      const allReports = await SaleReport.find({ asin1: { $in: asinList } });
  
      // Parse and normalize date ranges
      const start = new Date(startDate);
      const end = new Date(endDate);
      const prevStart = new Date(prevStartDate);
      const prevEnd = new Date(prevEndDate);
  
      const asinMap = {};
      for (const report of allReports) {
        if (!asinMap[report.asin1]) {
          asinMap[report.asin1] = {
            asin1: report.asin1,
            salesMetrics: [],
            allReports: [],
          };
        }
        asinMap[report.asin1].salesMetrics.push(...report.salesMetrics);
        asinMap[report.asin1].allReports.push(report);
      }
  
      const listings = asinGroup.map((asinEntry) => {
        const topSkuDoc = asinEntry.topSku;
        const metrics = asinMap[asinEntry._id]?.salesMetrics || [];
  
        let currentUnits = 0;
        let previousUnits = 0;
        const filteredMetrics = [];
  
        for (const metric of metrics) {
          const [startInterval] = metric.interval.split("--");
          const metricStart = new Date(startInterval);
  
          if (metricStart >= start && metricStart < end) {
            currentUnits += metric.units;
            filteredMetrics.push(metric);
          }
  
          if (metricStart >= prevStart && metricStart < prevEnd) {
            previousUnits += metric.units;
          }
        }
  
        let percentageChange = 0;
        if (previousUnits === 0 && currentUnits > 0) {
          percentageChange = 100;
        } else if (previousUnits === 0 && currentUnits === 0) {
          percentageChange = 0;
        } else if(currentUnits>previousUnits){ 
          percentageChange = ((currentUnits - previousUnits) / currentUnits) * 100;
        } else{
          percentageChange = ((currentUnits - previousUnits) / previousUnits) * 100;
        }
  
        return {
          _id: topSkuDoc._id,
          asin1: topSkuDoc.asin1,
          sellerSku: topSkuDoc.sellerSku,
          itemName: topSkuDoc.itemName,
          price: topSkuDoc.price,
          imageUrl: topSkuDoc.imageUrl,
          quantity: topSkuDoc.quantity,
          status: topSkuDoc.status,
          fulfillableQuantity: topSkuDoc.fulfillableQuantity,
          pendingTransshipmentQuantity: topSkuDoc.pendingTransshipmentQuantity,
          isFavourite: topSkuDoc.isFavourite,
          isHide: topSkuDoc.isHide,
          currentUnits,
          previousUnits,
          percentageChange: Math.round(percentageChange),
          salesMetrics: filteredMetrics
        };
      });
  
      const totalMatched = isAsin
        ? listings.length
        : await SaleReport.countDocuments(matchCondition);
      const totalPages = Math.ceil(totalMatched / limit);
  
      res.status(200).json({
        status: "Success",
        message: "ASIN metrics retrieved successfully",
        data: {
          totalProducts: totalMatched,
          currentPage: parseInt(page),
          totalPages,
          listings,
        },
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        status: "Error",
        message: "Internal server error while searching.",
      });
    }
  };
  
  

  exports.getSalesReportByAsinSku = async (req, res) => {
    try {
      const { type, value, startDate, endDate } = req.query;
  
      if (!type || !['sku', 'asin'].includes(type)) {
        return res.status(400).json({ status: 'Error', message: 'Invalid type. Must be either "sku" or "asin".' });
      }
  
      if (!value) {
        return res.status(400).json({ status: 'Error', message: 'Missing value for sku or asin.' });
      }
  
      const matchQuery = {};
      if (type === 'sku') {
        matchQuery.sellerSku = value;
      } else if (type === 'asin') {
        matchQuery.asin1 = value;
      }
  
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
  
      const pipeline = [
        { $match: matchQuery },
        { $unwind: '$salesMetrics' },
        {
          $addFields: {
            intervalStart: {
              $toDate: {
                $arrayElemAt: [
                  { $split: ['$salesMetrics.interval', '--'] },
                  0
                ]
              }
            }
          }
        },
        ...(startDate || endDate ? [{
          $match: {
            intervalStart: dateFilter
          }
        }] : []),
  
        {
          $group: {
            _id: '$salesMetrics.interval',
            totalUnits: { $sum: '$salesMetrics.units' },
            pricesWithSales: {
              $push: {
                $cond: [
                  { $gt: ['$salesMetrics.units', 0] },
                  '$salesMetrics.price',
                  null
                ]
              }
            }
          }
        },
        {
          $addFields: {
            // Filter out nulls (i.e., prices from units = 0) to get only real prices
            filteredPrices: {
              $filter: {
                input: '$pricesWithSales',
                as: 'price',
                cond: { $gt: ['$$price', 0] }
              }
            }
          }
        },
        {
          $addFields: {
            price: {
              $cond: [
                { $gt: ['$totalUnits', 0] },
                { $min: '$filteredPrices' },
                0
              ]
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];
  
      const intervalResults = await SaleReport.aggregate(pipeline);
  
      const totalUnits = intervalResults.reduce((acc, item) => acc + item.totalUnits, 0);
      const totalRevenue = intervalResults.reduce((acc, item) => acc + (item.totalUnits * item.price), 0);
  
      res.json({
        status: 'Success',
        message: 'Sales report fetched successfully',
        data: {
          totalUnits,
          totalRevenue,
          entries: intervalResults.map(item => ({
            interval: item._id,
            units: item.totalUnits,
            price: item.price
          }))
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'Error', message: 'Server error' });
    }
  };
  
  
exports.getReportAsinMode = async (req, res) => {

  try {
    const listings = await AsinModeReport.find({}).sort({ isFavourite:-1 });
    res.status(200).json({
      status: "Success",
      message: "Report retrieved successfully",
      data: {
        total:listings.length,
        listings,
      },
    })
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Server error while retrieving report",
      error: error.message
    })
  }
}

  
exports.getReportSkuMode = async (req, res) => {

  try {
    const listings = await SkuModeReport.find({}).sort({ isFavourite:-1 });
    res.status(200).json({
      status: "Success",
      message: "Report retrieved successfully",
      data: {
        total:listings.length,
        listings,
      },
    })
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Server error while retrieving report",
      error: error.message
    })
  }
}

exports.loadSaleBySku = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2300;
    const skip = (page - 1) * limit;

    const {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      sortByChange,
      sortOrder = "desc"
    } = req.query;

    console.log("Get Sale by SKU called", req.query);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const prevStart = new Date(prevStartDate);
    const prevEnd = new Date(prevEndDate);

    const pipeline = [
      { $match: { salesMetrics: { $exists: true, $ne: [] } } },

      // Filter only relevant salesMetrics
      {
        $addFields: {
          filteredSalesMetrics: {
            $filter: {
              input: "$salesMetrics",
              as: "metric",
          
              cond: {
                $or: [
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, start] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, end] }
                    ]
                  },
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, prevStart] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, prevEnd] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },

      // Final projection
      {
        $project: {
          sellerSku: 1,
          itemName: 1,
          price: 1,
          imageUrl: 1,
          status: 1,
          quantity: 1,
          isFavourite: 1,
          isHide: 1,
          asin1: 1,
          salesMetrics: "$filteredSalesMetrics"
        }
      }
    ];

    const rawResults = await SaleReport.aggregate(pipeline);

    // Calculate currentUnits, previousUnits, and percentageChange in JS per SKU
    const results = rawResults.map(item => {
      let currentUnits = 0;
      let previousUnits = 0;

      for (const metric of item.salesMetrics) {
        const [startStr, endStr] = metric.interval.split("--");
        const metricStart = new Date(startStr);
        const metricEnd = new Date(endStr);

        if (metricStart >= start && metricEnd <= end) {
          currentUnits += metric.units;
        } else if (metricStart >= prevStart && metricEnd <= prevEnd) {
          previousUnits += metric.units;
        }
      }

      let percentageChange = 0;

      if (previousUnits === 0 && currentUnits > 0) {
        percentageChange = 100;
      } else if (previousUnits === 0 && currentUnits === 0) {
        percentageChange = 0;
      } else if (currentUnits > previousUnits) {
        percentageChange = ((currentUnits - previousUnits) / currentUnits) * 100;
      } else {
        percentageChange = ((currentUnits - previousUnits) / previousUnits) * 100;
      }

      return {
        ...item,
        currentUnits,
        previousUnits,
        percentageChange: Math.round(percentageChange * 100) / 100
      };
    });

    // Sort in JS if needed
    if (sortByChange) {
      results.sort((a, b) => {
        return sortOrder === "asc"
          ? a.percentageChange - b.percentageChange
          : b.percentageChange - a.percentageChange;
      });
    }else {
      results.sort((a, b) => {
  
        if (a.isFavourite !== b.isFavourite) {
          return b.isFavourite - a.isFavourite;
        }
        
        return a.isHide - b.isHide;
      });
    }
    
    await SkuModeReport.deleteMany(); 
    await SkuModeReport.insertMany(results.map(({ _id,salesMetrics, ...rest }) => rest));

    const paginated = results.slice(skip, skip + limit);

    res.status(200).json({
      status: "Success",
      message: "SKU-based sales data retrieved",
      data: {
        totalProducts: results.length,
        currentPage: page,
        totalPages: Math.ceil(results.length / limit),
        listings: paginated
      }
    });

  } catch (error) {
    console.error("🔥 getSaleBySku failed:", error);
    res.status(500).json({
      status: "Error",
      message: "Server error while retrieving SKU sales",
      error: error.message
    });
  }
};

exports.loadSaleByAsin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      sortByChange,
      sortOrder,
      unitsOperator,
      unitsValue,
      unitsValue2 // used for between
    } = req.query;

    console.log("Get Sale by ASIN called", req.query);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const prevStart = new Date(prevStartDate);
    const prevEnd = new Date(prevEndDate);

    const matchUnits = {};
    if (unitsOperator && unitsValue !== undefined) {
      const val = parseInt(unitsValue);
      const val2 = unitsValue2 ? parseInt(unitsValue2) : null;

      switch (unitsOperator) {
        case "=": matchUnits.$eq = val; break;
        case "!=": matchUnits.$ne = val; break;
        case ">": matchUnits.$gt = val; break;
        case "<": matchUnits.$lt = val; break;
        case ">=": matchUnits.$gte = val; break;
        case "<=": matchUnits.$lte = val; break;
        case "between":
          if (val2 !== null) {
            matchUnits.$gte = val;
            matchUnits.$lte = val2;
          }
          break;
        default: break;
      }
    }

    const pipeline = [
      { $match: { asin1: { $ne: null } } },
      {
        $addFields: {
          filteredSalesMetrics: {
            $filter: {
              input: "$salesMetrics",
              as: "metric",
              cond: {
                $or: [
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, new Date(startDate)] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, new Date(endDate)] }
                    ]
                  },
                  {
                    $and: [
                      { $gte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 0] } }, new Date(prevStartDate)] },
                      { $lte: [{ $toDate: { $arrayElemAt: [{ $split: ["$$metric.interval", "--"] }, 1] } }, new Date(prevEndDate)] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      { $unwind: "$filteredSalesMetrics" },
      {
        $addFields: {
          metricStart: {
            $toDate: { $arrayElemAt: [{ $split: ["$filteredSalesMetrics.interval", "--"] }, 0] },
          },
          metricEnd: {
            $toDate: { $arrayElemAt: [{ $split: ["$filteredSalesMetrics.interval", "--"] }, 1] },
          },
        },
      },
      {
        $project: {
          asin1: 1,
          isFavourite: 1,
          isHide: 1,
          itemName: 1,
          sellerSku: 1,
          price: 1,
          imageUrl: 1,
          quantity: 1,
          status: 1,
          fulfillableQuantity: 1,
          pendingTransshipmentQuantity: 1,
          metricStart: 1,
          metricEnd: 1,
          salesMetric: "$filteredSalesMetrics",
          currentFlag: {
            $cond: [
              {
                $and: [
                  { $gte: ["$metricStart", start] },
                  { $lte: ["$metricEnd", end] }
                ]
              },
              true,
              false
            ]
          },
          previousFlag: {
            $cond: [
              {
                $and: [
                  { $gte: ["$metricStart", prevStart] },
                  { $lte: ["$metricEnd", prevEnd] }
                ]
              },
              true,
              false
            ]
          }
        }
      },
      {
        $group: {
          _id: "$asin1",
          doc: { $first: "$$ROOT" },
          currentUnits: {
            $sum: {
              $cond: ["$currentFlag", "$salesMetric.units", 0]
            }
          },
          previousUnits: {
            $sum: {
              $cond: ["$previousFlag", "$salesMetric.units", 0]
            }
          },
          salesMetrics: {
            $push: {
              $cond: [
                { $or: ["$currentFlag", "$previousFlag"] },
                "$salesMetric",
                "$$REMOVE"
              ]
            }
          }
        }
      },
      {
        $addFields: {
          percentageChange: {
            $cond: [
              { $eq: ["$previousUnits", "$currentUnits"] },
              0,
              {
                $cond: [
                  { $gt: ["$currentUnits", "$previousUnits"] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$currentUnits", "$previousUnits"] },
                          { $cond: [{ $eq: ["$currentUnits", 0] }, 1, "$currentUnits"] }
                        ]
                      },
                      100
                    ]
                  },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$currentUnits", "$previousUnits"] },
                          { $cond: [{ $eq: ["$previousUnits", 0] }, 1, "$previousUnits"] }
                        ]
                      },
                      100
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      ...(Object.keys(matchUnits).length > 0 ? [
        { $match: { currentUnits: matchUnits } }
      ] : []),
      {
        $sort: sortByChange ? {
          percentageChange: sortOrder === "asc" ? 1 : -1
        } : {
          "doc.isFavourite": -1,
          "doc.isHide": 1
        }
      },
      // { $skip: skip },
      // { $limit: limit },
      {
        $project: {
          asin1: "$_id",
          sellerSku: "$doc.sellerSku",
          itemName: "$doc.itemName",
          price: "$doc.price",
          imageUrl: "$doc.imageUrl",
          quantity: "$doc.quantity",
          status: "$doc.status",
          fulfillableQuantity: "$doc.fulfillableQuantity",
          pendingTransshipmentQuantity: "$doc.pendingTransshipmentQuantity",
          isFavourite: "$doc.isFavourite",
          isHide: "$doc.isHide",
          currentUnits: 1,
          previousUnits: 1,
          percentageChange: 1,
          salesMetrics: 1
        }
      }
    ];

    const listings = await SaleReport.aggregate(pipeline);
    const totalAsins = await SaleReport.distinct("asin1", { asin1: { $ne: null } });

    await AsinModeReport.deleteMany(); 
    await AsinModeReport.insertMany(listings.map(({ _id,salesMetrics, ...rest }) => rest));

    res.status(200).json({
      status: "Success",
      message: "ASIN metrics retrieved successfully",
      data: {
        totalProducts: listings.length,
        currentPage: page,
        totalPages: Math.ceil(totalAsins.length / limit),
        listings,
      },
    });
  } catch (error) {
    console.error("🔥 ASIN aggregation failed:", error);
    res.status(500).json({
      status: "Error",
      message: "Failed to retrieve ASIN metrics",
    });
  }
};
