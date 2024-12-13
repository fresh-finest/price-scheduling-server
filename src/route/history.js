const express= require("express");
const { getHistory, getHistoryById, getLimitHistory, searchHistoryByAsinSku, filterHistoryByDateRange } = require("../controller/historyController");

const router = express.Router();

//get /api/history/:schdeuleId
router.route("/limit").get(getLimitHistory);
router.route("/date-range").get(filterHistoryByDateRange);
router.route("/search/:uid").get(searchHistoryByAsinSku);
router.route("/").get(getHistory);
router.route("/:scheduledId").get(getHistoryById);

module.exports = router;