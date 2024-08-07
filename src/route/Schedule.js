const express = require("express");

const { createPriceSchedule, getPriceSchedule } = require("../controller/PriceScheduleController")

const router = express.Router();

router.route("/").post(createPriceSchedule);
router.route("/").get(getPriceSchedule);

module.exports = router;