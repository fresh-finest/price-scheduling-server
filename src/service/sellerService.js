const Seller = require("../model/Seller")




exports.getAllSellerService = async()=>{
    const sellers = await Seller.find();
    return sellers;
}

exports.getSellerByIdService=async(id)=>{
    const seller = Seller.findById({_id:id});
    return seller;
}

exports.createSellerService= async(data)=>{
    const seller =  await Seller.create(data);
    return seller;
}

exports.updateSellerService= async(id,data)=>{
    const seller = await Seller.updateOne(
        {_id:id},
        {
            $set:data
        },
        {runValidators:true}
    )
    return seller;
}

exports.deleteSellerServiceById = async(id)=>{
    const deletedSeller = await Seller.deleteOne({_id:id});
    return deletedSeller;
 }
