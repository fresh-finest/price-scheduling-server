const OwnerAccount = require("../model/OwnerAccount")

exports.createOwnerAccount = async(req,res)=>{
    try {
        
        const result = await OwnerAccount.create(req.body);
        res.status(201).json({result});

    } catch (error) {
        res.status(400).json({error:error.message});
    }
}

exports.getOwnerAccount = async(req,res,next)=>{
    try {
        const result = await OwnerAccount.find();
        res.status(200).json({result});
    } catch (error) {
        next();
    }
}

exports.getOwnerAccountByUserId = async(req,res,next)=>{
    const{ userId} = req.params;
    try {
         const result = await OwnerAccount.findOne({userId});
         res.status(200).json({result});
    } catch (error) {
        next();
    }
}