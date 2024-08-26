const express = require("express");

const { createPriceSchedule, getPriceSchedule, createPriceScheduleByAsin, getPriceScheduleByUser, updatePriceScheduleById, getPriceScheduleById, deletePriceScheduleById, deletedHistory } = require("../controller/PriceScheduleController");


const router = express.Router();


router.route("/:userName/list").get(getPriceScheduleByUser);
router.route("/history").get(deletedHistory);
// router.route("/:id").put(updatePriceScheduleById);
// router.route("/:id").delete(deletePriceScheduleById);
router.route("/:id/single-schedule").get(getPriceScheduleById);
router.route("/:asin").get(createPriceScheduleByAsin);
router.route("/").post(createPriceSchedule);
router.route("/").get(getPriceSchedule);


module.exports = router;