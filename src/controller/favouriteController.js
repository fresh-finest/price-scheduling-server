const { currentLineHeight } = require("pdfkit");
const Favourite = require("../model/Favourite");

const { updateIsFavouriteService, updateIsHideService, searchBySkuAsinService } = require("../service/favouriteService");
const SaleReport = require("../model/SaleReport");
const Product = require("../model/Product");

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
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        let keyword =  uid ? uid.replace(/^\s+/, "") : "";
         
        let result;
        if (keyword.startsWith("B0") && keyword.length === 10) {
            result = await searchBySkuAsinService(null, keyword, page, limit);
        } else {
            console.log("searching by sku",uid);
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


/*
exports.getAsinSaleMetrics = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const skip = (page - 1) * limit;
  
      // Step 1: Paginate ASINs
      const asinList = await SaleReport.aggregate([
        { $match: { asin1: { $ne: null } } },
        { $group: { _id: "$asin1" } },
        // { $sort: { _id: 1 } },
        { $sort: { isFavourite: -1, asin1: 1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      
      const asinValues = asinList.map((item) => item._id);
  
      // Step 2: Merge sales metrics by ASIN and get one product per ASIN
      const aggregated = await SaleReport.aggregate([
        { $match: { asin1: { $in: asinValues } } },
        {
          $lookup: {
            from: "salereports",
            localField: "sellerSku",
            foreignField: "sellerSku",
            as: "report",
          },
        },
        { $unwind: "$report" },
        { $unwind: "$report.salesMetrics" },
        {
          $group: {
            _id: {
              asin: "$asin1",
              interval: "$report.salesMetrics.interval",
            },
            totalUnits: { $sum: "$report.salesMetrics.units" },
            totalRevenue: {
              $sum: {
                $multiply: ["$report.salesMetrics.units", "$report.salesMetrics.price"],
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
                  $cond: {
                    if: { $eq: ["$totalUnits", 0] },
                    then: 0,
                    else: {
                      $round: [{ $divide: ["$totalRevenue", "$totalUnits"] }, 2],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "asin1",
            as: "productInfo",
          },
        },
        {
          $addFields: {
            product: { $first: "$productInfo" },
          },
        },
        {
          $project: {
            _id: 0,
            asin1: "$_id",
            salesMetrics: 1,
            sellerSku: "$product.sellerSku",
            itemName: "$product.itemName",
            price: "$product.price",
            imageUrl: "$product.imageUrl",
            status: "$product.status",
            quantity: "$product.quantity",
            fulfillableQuantity: "$product.fulfillableQuantity",
            pendingTransshipmentQuantity: "$product.pendingTransshipmentQuantity",
            isFavourite: "$product.isFavourite",
            isHide: "$product.isHide",
          },
        },
      ]);
  
      // Total unique ASINs
      const totalAsins = await Product.distinct("asin1", { asin1: { $ne: null } });
      const totalPages = Math.ceil(totalAsins.length / limit);
  
      res.status(200).json({
        status: "Success",
        message: "ASIN metrics retrieved successfully",
        data: {
          totalProducts: totalAsins.length,
          currentPage: page,
          totalPages,
          listings: aggregated,
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
  
*/

exports.getAsinSaleMetrics = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
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
  
  /*

  exports.searchAsinSaleMetrics = async (req, res) => {
    try {
      const { query } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const skip = (page - 1) * limit;
  
      if (!query) {
        return res.status(400).json({
          status: "Error",
          message: "Missing search query.",
        });
      }
  
      // Step 1: Build regex filters from keyword query (e.g., "Caramel Vanilla")
      const words = query.trim().split(/\s+/);
    //   const regexConditions = words.map((word) => ({
    //     itemName: { $regex: word, $options: "i" },
    //     asin1: { $regex: word, $options: "i" },
    //     sellerSku: { $regex: word, $options: "i" },
    //   }));
    const regexConditions = words.flatMap((word) => [
        { itemName: { $regex: word, $options: "i" } },
        { asin1:word  },
        { sellerSku: { $regex: word, $options: "i" } },
      ]);
    //   const matchedReports = await SaleReport.find({
    //     $or: regexConditions,
    //   });
      // Step 2: Find matching ASINs from SaleReport
      const asinGroup = await SaleReport.aggregate([
        { $match: { $or: regexConditions } },
        { $group: { _id: "$asin1" } },
        { $skip: skip },
        { $limit: limit },
      ]);
  
      const asinList = asinGroup.map((a) => a._id);
  
      // Step 3: Get all reports for those ASINs
      const allReports = await SaleReport.find({ asin1: { $in: asinList } });
  
      // Step 4: Group reports by ASIN
      const asinMap = {};
      for (const report of allReports) {
        if (!asinMap[report.asin1]) {
          asinMap[report.asin1] = {
            _id: report._id,
            asin1: report.asin1,
            sellerSku: report.sellerSku,
            itemName: report.itemName,
            price: report.price,
            imageUrl: report.imageUrl,
            status: report.status,
            quantity: report.quantity,
            fulfillableQuantity: report.fulfillableQuantity,
            pendingTransshipmentQuantity: report.pendingTransshipmentQuantity,
            isFavourite: report.isFavourite,
            isHide: report.isHide,
            salesMetrics: [],
          };
        }
  
        asinMap[report.asin1].salesMetrics.push(...report.salesMetrics);
      }
  
      // Step 5: Merge metrics per ASIN
      const listings = Object.values(asinMap).map((asinEntry) => {
        const intervalMap = {};
  
        asinEntry.salesMetrics.forEach((metric) => {
          const key = metric.interval;
          if (!intervalMap[key]) {
            intervalMap[key] = {
              interval: metric.interval,
              units: 0,
              price: 0,
              _id: metric._id,
            };
          }
          intervalMap[key].units += metric.units;
          intervalMap[key].price += metric.price * metric.units;
        });
  
        const mergedMetrics = Object.values(intervalMap).map((m) => ({
          interval: m.interval,
          units: m.units,
          price: m.units > 0 ? +(m.price / m.units).toFixed(2) : 0,
          _id: m._id,
        }));
  
        return {
          _id: asinEntry._id,
          sellerSku: asinEntry.sellerSku,
          itemName: asinEntry.itemName,
          price: asinEntry.price,
          imageUrl: asinEntry.imageUrl,
          asin1: asinEntry.asin1,
          status: asinEntry.status,
          quantity: asinEntry.quantity,
          fulfillableQuantity: asinEntry.fulfillableQuantity,
          pendingTransshipmentQuantity: asinEntry.pendingTransshipmentQuantity,
          isFavourite: asinEntry.isFavourite,
          isHide: asinEntry.isHide,
          salesMetrics: mergedMetrics,
        };
      });
  
      const totalProducts = await SaleReport.countDocuments({ $or: regexConditions });
      const totalPages = Math.ceil(totalProducts / limit);
  
      res.status(200).json({
        status: "Success",
        message: "Search results loaded successfully.",
        data: {
          totalProducts,
          currentPage: page,
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
  */


  exports.searchAsinSaleMetrics = async (req, res) => {
    try {
      const { query } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const skip = (page - 1) * limit;
  
      if (!query) {
        return res.status(400).json({
          status: "Error",
          message: "Missing search query.",
        });
      }
  
      const words = query.trim().split(/\s+/);
  
      // If search matches a full ASIN, only search for that exact ASIN
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
  
      // Step 1: Get matching ASINs
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
        { $limit: limit },
      ]);
  
      const asinList = asinGroup.map((item) => item._id);
  
      // Step 2: Get all SaleReports for the matched ASINs
      const allReports = await SaleReport.find({ asin1: { $in: asinList } });
  
      // Step 3: Merge metrics and attach product info
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
        const salesMetrics = asinMap[asinEntry._id]?.salesMetrics || [];
  
        // Merge salesMetrics by interval
        const intervalMap = {};
        salesMetrics.forEach((metric) => {
          const key = metric.interval;
          if (!intervalMap[key]) {
            intervalMap[key] = {
              interval: metric.interval,
              units: 0,
              price: 0,
              _id: metric._id,
            };
          }
          intervalMap[key].units += metric.units;
          intervalMap[key].price += metric.price * metric.units;
        });
  
        const mergedMetrics = Object.values(intervalMap).map((m) => ({
          interval: m.interval,
          units: m.units,
          price: m.units > 0 ? +(m.price / m.units).toFixed(2) : 0,
          _id: m._id,
        }));
  
        return {
          _id: topSkuDoc._id,
          sellerSku: topSkuDoc.sellerSku,
          itemName: topSkuDoc.itemName,
          price: topSkuDoc.price,
          imageUrl: topSkuDoc.imageUrl,
          asin1: topSkuDoc.asin1,
          status: topSkuDoc.status,
          quantity: topSkuDoc.quantity,
          fulfillableQuantity: topSkuDoc.fulfillableQuantity,
          pendingTransshipmentQuantity: topSkuDoc.pendingTransshipmentQuantity,
          isFavourite: topSkuDoc.isFavourite,
          isHide: topSkuDoc.isHide,
          salesMetrics: mergedMetrics,
        };
      });
  
      const totalMatched = isAsin
        ? listings.length
        : await SaleReport.countDocuments(matchCondition);
      const totalPages = Math.ceil(totalMatched / limit);
  
      res.status(200).json({
        status: "Success",
        message: "Search results loaded successfully.",
        data: {
          totalProducts: totalMatched,
          currentPage: page,
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
  