const express = require("express");
const {
  searchProductsByAsinSku,
  getProductByFbaFbm,
  getLimitProduct,
  getFilteredByMetrics,
  getFilteredByStock,
  getFilteredSchedulesAndStocks,
  getFilteredSortedAndPaginatedSaleStock,
  getFilteredProduct,
  getSalesComparision,
  updateTag,
  deleteTag
} = require("../controller/productController");

const router = express.Router();
router.route("/sale-stock").get(getFilteredProduct)
router.route("/sort").get(getFilteredSortedAndPaginatedSaleStock)
router.route("/schedule").get(getFilteredSchedulesAndStocks)
router.route("/sale").get(getSalesComparision)
router.route("/tag/:sku").put(updateTag);
router.route("/tag/:sku/cancel").put(deleteTag);
// router.route("/filter/unit").get(getFilteredByMetrics);
// router.route("/stock").get(getFilteredByStock);
router.route("/limit").get(getLimitProduct);
router.route("/:uid").get(searchProductsByAsinSku);
// router.route("/channel/:type").get(getProductByFbaFbm);
module.exports = router;
