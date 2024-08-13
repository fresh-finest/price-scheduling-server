const express = require("express");
const { signin, logOut } = require("../controller/authController");

const router = express.Router();

router.post("/signin",signin);
router.get("/logout",logOut);

module.exports = router;