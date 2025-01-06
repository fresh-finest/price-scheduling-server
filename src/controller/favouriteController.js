const { currentLineHeight } = require("pdfkit");
const Favourite = require("../model/Favourite");
const SaleStock = require("../model/SaleStock");
const { updateIsFavouriteService, updateIsHideService } = require("../service/favouriteService");


const mapSaleStockToFavourite = async (saleStock) => {
    const existingFavourites = await Favourite.find();
    
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
        const saleStock = await SaleStock.find();
        const newFavourites = await mapSaleStockToFavourite(saleStock);

        if (newFavourites.length > 0) {
            await Favourite.insertMany(newFavourites);
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        if(page <1 || limit <1){
            return res.status(400).json({
                status:"Failed",
                message:"Invalid page or limit"
            })
        }

        const skip = (page - 1) * limit;

        const totalProducts = await Favourite.countDocuments();

        const products = await Favourite.find()
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
};


exports.updateIsFavourite = async(req,res)=>{
    const {sku} = req.params;
    const {isFavourite} = req.body;

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

