const express = require("express");
const {
  searchProductsByAsinSku,
  getProductByFbaFbm,
  getLimitProduct,
  getFilteredByMetrics,
  getFilteredByStock,
  getFilteredSchedulesAndStocks,
  getFilteredSortedAndPaginatedSaleStock
} = require("../controller/productController");

const router = express.Router();
router.route("/sort").get(getFilteredSortedAndPaginatedSaleStock)
router.route("/schedule").get(getFilteredSchedulesAndStocks)
router.route("/filter/unit").get(getFilteredByMetrics);
router.route("/stock").get(getFilteredByStock);
router.route("/limit").get(getLimitProduct);
router.route("/:uid").get(searchProductsByAsinSku);
router.route("/channel/:type").get(getProductByFbaFbm);
module.exports = router;
