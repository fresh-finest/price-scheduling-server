const express = require("express");
const { checkLowSalesNotifications } = require("../notifications/LowSaleNotification");
const router = express.Router();




router.get("/stock",checkLowSalesNotifications);

module.exports = router;