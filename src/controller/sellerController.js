const { getAllSellerService, getSellerByIdService, createSellerService, updateSellerService, deleteSellerServiceById } = require("../service/sellerService")

exports.getAllSellers = async(req,res)=>{
    try {
        const sellers = await getAllSellerService();

        res.status(200).json({
            status:"Success",
            message:"Fetched sellers",
            sellers
        })
    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message:"Failed to fetch sellers",
            error:error.message
        })
    }
}

exports.getSellerById = async(req,res)=>{
    try {
        const seller = await getSellerByIdService(req.params.id);
        if(!seller){
            return res.status(404).json({error:"Seller not found"});
        }
        res.status(200).json(seller);
    } catch (error) {
        res.status(500).json({
            eror:error.message
        })
    }
}

exports.createSeller = async(req,res)=>{
    try {
        const seller = await createSellerService(req.body);
        res.status(201).json(seller);
    } catch (error) {
        res.status(400).json({error:error.message});
    }
}

exports.updateSeller = async(req,res)=>{
    try {
        const seller = await updateSellerService(req.params.id,req.body);
        if(!seller){
            return res.status(404).json({
                error:"Seller not found"
            })
        }
        res.status(200).json(seller);
    } catch (error) {
        res.status(400).json({error:error.message});
    }
}

exports.deleteSeller = async(req,res)=>{
    try {
        const seller = await deleteSellerServiceById(req.params.id);
        if(!seller){
            res.status(404).json({error:"Seller not found"});
        }
        res.status(200).json({message:'Seller deleted successfully'});
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}