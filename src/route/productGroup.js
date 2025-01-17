
const express = require("express");
const { createGroup, getGroup, updateGroup, updateSku, getSkuDetails, deleteGroup, getGroupById } = require("../controller/productGroupController");

const router = express.Router();

router.route("/").post(createGroup).get(getGroup);
router.route("/:id").put(updateGroup).delete(deleteGroup).get(getGroupById);
router.route("/:id/sku").put(updateSku);
router.route("/sku/:sku").get(getSkuDetails);


module.exports = router;