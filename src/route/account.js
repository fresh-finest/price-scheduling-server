const express= require("express");
const { getAccount, createAccount } = require("../controller/accountController");
const { createOwnerAccount, getOwnerAccount, getOwnerAccountByUserId } = require("../controller/ownerAccountController");


const router = express.Router();

//get /api/history/:schdeuleId

router.route("/").get(getAccount);
router.route("/").post(createAccount);

router.route("/owner").post(createOwnerAccount).get(getOwnerAccount);
router.route("/owner/:userId").get(getOwnerAccountByUserId);
module.exports = router;