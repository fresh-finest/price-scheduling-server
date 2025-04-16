
const express = require("express");
const { getFavourites, updateIsFavourite, updateIsHide, getReport, getReportBySku, searchProductsByAsinSku, getAsinSaleMetrics, searchAsinSaleMetrics,getSalesReportByAsinSku,getSaleBySku, getSaleByAsin, getReportAsinMode, getReportSkuMode} = require("../controller/favouriteController");

const router = express.Router();


router.route("/report/sku-mode").get(getReportSkuMode)
router.route("/report/asin-mode").get(getReportAsinMode)
router.route("/report/load-sku").get(getSaleBySku)
router.route("/report/load-asin").get(getSaleByAsin)
router.route("/report/skus").get(getSaleBySku)
router.route("/report/byasins").get(getSaleByAsin)
router.route("/sale-units").get(getSalesReportByAsinSku)
router.route("/search/:uid").get(searchProductsByAsinSku);
router.route("/find/:query").get(searchAsinSaleMetrics);
router.route("/limit").get(getFavourites);
router.route("/report").get(getReport)
router.route("/report/asins").get(getAsinSaleMetrics)
router.route("/:sku").put(updateIsFavourite).get(getReportBySku);
router.route("/:sku/hide").put(updateIsHide);

module.exports = router;