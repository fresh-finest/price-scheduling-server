


//get /api/history/:schdeuleId

exports.getHistoryById = async(req,res,next)=>{
    const { scheduleId } = req.params;
  
    try {
      
      const history = await History.find({scheduleId}).sort({ createdAt: -1 });
  
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
}

//get /api/history/
exports.getHistory= async(req,res,next)=>{
    try {   
        const result = await History.find().sort({ createdAt: -1 });
        
        res.status(200).json({
          status: "Success",
          message: "Successfully fetch data.",
          result,
        });
      } catch (error) {
        res.status(400).json({
          status: "Fail",
          message: "Couldn't fetch data.",
          error: error.message
      });
      }
}
 