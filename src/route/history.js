const express= require("express");
const { getHistory, getHistoryById, getLimitHistory } = require("../controller/historyController");

const router = express.Router();

//get /api/history/:schdeuleId

router.route("/").get(getHistory);
router.route("/:scheduledId").get(getHistoryById);
router.route("/limit").get(getLimitHistory);

module.exports = router;