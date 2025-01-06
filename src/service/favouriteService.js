const Favourite = require("../model/Favourite")



exports.updateIsFavouriteService = async(sellerSku,isFavourite)=>{
    try {
        const updateFavourite = await Favourite.findOneAndUpdate(
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
        const updateHide = await Favourite.findOneAndUpdate(
            {sellerSku},
            {isHide},
            {new:true}
        )
        return updateHide;
    } catch (error) {
        throw new Error(error.message); 
    }
}
