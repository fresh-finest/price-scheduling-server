const express = require("express");

const { createPriceSchedule, getPriceSchedule, createPriceScheduleByAsin } = require("../controller/PriceScheduleController")

const router = express.Router();

router.route("/").post(createPriceSchedule);
router.route("/").get(getPriceSchedule);
router.route("/:asin").get(createPriceScheduleByAsin);
module.exports = router;