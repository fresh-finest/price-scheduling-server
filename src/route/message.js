
const express = require('express');
const { saveSellerMessage, getAllMessages, getMessageBySeller, addSupportResponse } = require('../controller/messageController');


const router = express.Router();


router.route("/").post(saveSellerMessage).get(getAllMessages);
router.route("/:sellerId").get(getMessageBySeller);
router.route("/:messageId").patch(addSupportResponse);

module.exports = router;