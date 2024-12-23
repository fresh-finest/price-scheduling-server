const express = require("express");
const { getAllSellers, getSellerById, createSeller, deleteSeller, updateSeller } = require("../controller/sellerController");

const router = express.Router();


router.route("/").get(getAllSellers);
router.route("/:id").get(getSellerById);
router.route("/:id").put(updateSeller)
router.route("/:id").delete(deleteSeller)
router.route("/").post(createSeller);

module.exports = router;
