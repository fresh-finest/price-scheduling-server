const express = require("express");
const { signin, logOut, resetPassword,storeToken } = require("../controller/authController");

const router = express.Router();

router.post('/:id/token',storeToken);
router.post("/signin",signin);
router.get("/logout",logOut);
router.post("/reset-password",resetPassword);
module.exports = router;