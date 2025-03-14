
const express = require("express");
const { getFavourites, updateIsFavourite, updateIsHide, getReport, getReportBySku, searchProductsByAsinSku } = require("../controller/favouriteController");

const router = express.Router();

router.route("/search/:uid").get(searchProductsByAsinSku);
router.route("/limit").get(getFavourites);
router.route("/report").get(getReport)
router.route("/:sku").put(updateIsFavourite).get(getReportBySku);
router.route("/:sku/hide").put(updateIsHide);

module.exports = router;