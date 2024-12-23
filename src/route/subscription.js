const express = require("express");
const { createFreeTrial, createPaidSubscription, getSubscriptionBySeller, cancelSubscription, updateSubscriptionStatus, getAllSubscriber } = require("../controller/subscriptionController");

const router = express.Router();

router.route("/").get(getAllSubscriber);
router.route("/free-trial").post(createFreeTrial);
router.route("/paid-account").post(createPaidSubscription);
router.route("/:sellerId").get(getSubscriptionBySeller);
router.route("/:subscriptionId/cancel").put(cancelSubscription);
router.route("/:subscriptionId/update").put(updateSubscriptionStatus);



module.exports = router;