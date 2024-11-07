const express= require("express");
const { getAccount, createAccount } = require("../controller/accountController");


const router = express.Router();

//get /api/history/:schdeuleId

router.route("/").get(getAccount);
router.route("/").post(createAccount);


module.exports = router;