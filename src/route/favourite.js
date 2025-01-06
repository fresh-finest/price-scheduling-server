
const express = require("express");
const { getFavourites, updateIsFavourite, updateIsHide } = require("../controller/favouriteController");

const router = express.Router();

router.route("/limit").get(getFavourites);

router.route("/:sku").put(updateIsFavourite);
router.route("/:sku/hide").put(updateIsHide);

module.exports = router;