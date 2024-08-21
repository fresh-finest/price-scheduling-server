const express = require("express");

const { createPriceSchedule, getPriceSchedule, createPriceScheduleByAsin, getPriceScheduleByUser, updatePriceScheduleById } = require("../controller/PriceScheduleController")

const router = express.Router();

router.route("/:id").put(updatePriceScheduleById);

router.route("/").post(createPriceSchedule);
router.route("/").get(getPriceSchedule);
router.route("/:asin").get(createPriceScheduleByAsin);
router.route("/:userName/list").get(getPriceScheduleByUser);
module.exports = router;