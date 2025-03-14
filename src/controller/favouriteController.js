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