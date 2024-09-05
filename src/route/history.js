const express= require("express");
const { getHistory, getHistoryById } = require("../controller/historyController");

const router = express.Router();

//get /api/history/:schdeuleId

router.route("/").get(getHistory);
router.route("/:scheduledId").get(getHistoryById);


module.exports = router;