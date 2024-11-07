const { getAccountService, createAccountService } = require("../service/accountService");


exports.createAccount = async(req,res,next)=>{
    try {
        const result = await createAccountService(req.body);

        res.status(201).json({
            status:"Success",
            message:"Successfully created account.",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Fails",
            message:"Couldn't add products",
            error:error.message
        })
    }
}

exports.getAccount = async(req,res,next)=>{
    try {
        const result = await getAccountService();
        res.status(200).json({
            status:"success",
            message:"Get account",
            result
        })
    } catch (error) {
        
        res.status(400).json({
            status:"Fails",
            message:"Couldn't fetch data",
            error:error.message
        })
    }
}