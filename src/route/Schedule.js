const express = require("express");

const { createPriceSchedule, getPriceSchedule, getPriceScheduleByUser, getPriceScheduleById, deletedHistory, getPriceScheduleBySku } = require("../controller/PriceScheduleController");


const router = express.Router();


router.route("/:userName/list").get(getPriceScheduleByUser);
router.route("/history").get(deletedHistory);
// router.route("/:id").put(updatePriceScheduleById);
// router.route("/:id").delete(deletePriceScheduleById);
router.route("/:id/single-schedule").get(getPriceScheduleById);
router.route("/:sku").get(getPriceScheduleBySku);
router.route("/").post(createPriceSchedule);
router.route("/").get(getPriceSchedule);


module.exports = router;