

const express = require("express");
const { createBill, getBills, downloadBill } = require("../controller/billingController");



const router = express.Router();

router.route("/").post(createBill);
router.route("/:sellerId").get(getBills);
router.route("/download/:sellerId").get(downloadBill);


module.exports = router;