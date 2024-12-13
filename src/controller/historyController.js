//get /api/history/:schdeuleId

const History = require("../model/HistorySchedule");
const {
  searchHistoryBySkuAsinService,
  filterHistoryByDateRangeService,
} = require("../service/historyService");

exports.getHistoryById = async (req, res, next) => {
  const { scheduleId } = req.params;

  try {
    const history = await History.find({ scheduleId }).sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

// exports.getLimitHistory = async (req, res) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 20;
//   const skip = (page - 1) * limit;

//   const totalHistoris = await History.countDocuments();
//   const histories = await History.find().skip(skip).limit(limit);
//   res.json({page,limit, totalHistoris, histories });
// };

exports.getLimitHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        status: "Failed",
        message: "Page and limit values must be greater than 0.",
      });
    }

    const skip = (page - 1) * limit;

    const totalHistoris = await History.countDocuments();

    const histories = await History.find().skip(skip).limit(limit);

    if (histories.length === 0) {
      return res.status(404).json({
        status: "Failed",
        message: "Not products found for the page and limit",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Successfully get histories",
      totalHistoris,
      currentPage: page,
      totalPages: Math.ceil(totalHistoris / limit),
      histories,
    });
  } catch (error) {
    res.status(500).json({
      status: "Failed",
      message: "Error occured",
      error: error.message,
    });
  }
};

// exports.searchHistoryByAsinSku
//
exports.searchHistoryByAsinSku = async (req, res, next) => {
  try {
    const { uid } = req.params;
    let result;
    if (uid.startsWith("B0") && uid.length === 10) {
      result = await searchHistoryBySkuAsinService(null, uid);
    } else {
      result = await searchHistoryBySkuAsinService(uid, null);
    }

    res.status(200).json({
      status: "Success",
      message: "Successfully searched history",
      result,
    });
  } catch (error) {
    res.status(500).json({
      status: "Failed",
      message: "Failed to search product",
      error: error.message,
    });
  }
};

exports.filterHistoryByDateRange = async (req,res) => {
  try {
    const { startDate, endDate, weekly, monthly } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Failed",
        message: "startDate and endDate are required",
      });
    }

    const includeWeekly = weekly === "true";
    const includeMonthly = monthly === "true";

    const result = await filterHistoryByDateRangeService(
      startDate,
      endDate,
      includeWeekly,
      includeMonthly
    );
    res.status(200).json({
      status:"Success",
      mesage:"Filtered histories successfully",
      data:result
    })
    
  } catch (error) {
    res.status(500).json({
      status:"Failed",
      message:"Failed filtered",
      error:error.message
    })
  }
};

//get /api/history/
exports.getHistory = async (req, res, next) => {
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
      error: error.message,
    });
  }
};
