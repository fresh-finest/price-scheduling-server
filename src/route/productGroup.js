
const express = require("express");
const { createGroup, getGroup, updateGroup, updateSku, getSkuDetails, deleteGroup, getGroupById, bulkUpdateGroups, getProductGroupWithSales, searchProductGroups, groupFilterByStock } = require("../controller/productGroupController");

const router = express.Router();

router.route("/search").get(searchProductGroups)
router.route("/filter").get(groupFilterByStock)
router.route("/").post(createGroup).get(getGroup).put(bulkUpdateGroups);
router.route("/:id").put(updateGroup).delete(deleteGroup).get(getGroupById);
router.route("/:id/sku").put(updateSku);
router.route("/sku/:sku").get(getSkuDetails);
router.route("/sale-report/:id").get(getProductGroupWithSales);

module.exports = router;