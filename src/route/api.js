const express= require("express");
const { getProductByAsin } = require("../service/ApiService");

const router = express.Router();

//get /details/:asin
// get /product/:asin

router.route("/:asin").get(getProductByAsin)
router.route("/:asin").get(getDetailsByAsin)


module.exports = router;