const { getBillService, createBillService, generatePDFService } = require("../service/billingService");

const fs = require("fs");




exports.createBill = async(req,res,next)=>{
    try {
        
        const newBill = await createBillService(req.body);

        res.status(201).json({newBill});

    } catch (error) {
        res.status(500).json({error:error.message});
    }
}

exports.getBills = async(req, res, next)=>{
    try {
        const {sellerId} = req.params;

        const bills = await getBillService(sellerId);

        res.status(200).json({bills});
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}



exports.downloadBill = async(req,res)=>{
    try {
        const { sellerId } = req.params;
    
        if (!sellerId) {
          return res.status(400).json({ error: "Seller ID is required" });
        }
    
        const bills = await getBillService(sellerId);
        await generatePDFService(sellerId, bills, res);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
}


