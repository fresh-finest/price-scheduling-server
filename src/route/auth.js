const express = require("express");
const { signin } = require("../controller/authController");

const router = express.Router();

router.post("/signin",signin);

module.exports = router;