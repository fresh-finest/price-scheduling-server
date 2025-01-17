const express = require("express");
const {
  searchProductsByAsinSku,
  getProductByFbaFbm,
  getLimitProduct,
  getFilteredByMetrics,
  getFilteredByStock,
  getFilteredSchedulesAndStocks,
  getFilteredSortedAndPaginatedProduct,
  getFilteredProduct,
  getSalesComparision,
  updateTag,
  deleteTag,
  getSingleProduct,
  updateGroup,
  deleteGroup,
  updateProductToFavoutire,
  updateProductToHide
} = require("../controller/productController");


const router = express.Router();
router.route("/sale-stock").get(getFilteredProduct)
router.route("/sort").get(getFilteredSortedAndPaginatedProduct)
router.route("/schedule").get(getFilteredSchedulesAndStocks)
router.route("/sale").get(getSalesComparision)
router.route("/tag/:sku").put(updateTag).get(getSingleProduct);
router.route("/tag/:sku/cancel").put(deleteTag);
router.route("/group/:sku").put(updateGroup);
router.route("/group/:sku/cancel").put(deleteGroup);
// router.route("/filter/unit").get(getFilteredByMetrics);
// router.route("/stock").get(getFilteredByStock);
router.route("/limit").get(getLimitProduct);
router.route("/:uid").get(searchProductsByAsinSku);
// router.route("/channel/:type").get(getProductByFbaFbm);

router.route("/favourite/:sku").put(updateProductToFavoutire);
router.route("/hide/:sku").put(updateProductToHide);
module.exports = router;
