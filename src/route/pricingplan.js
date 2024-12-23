const express = require("express");
const {
  createPricePlan,
  getPricePlan,
  getPricingPlanByProduct,
  updatePricingPlan,
  deletePricingPlan,
} = require("../controller/pricingplanController");

const router = express.Router();

router.route("/").post(createPricePlan).get(getPricePlan);
router.route("/:product").get(getPricingPlanByProduct);
router.route("/:id").put(updatePricingPlan);
router.route("/:id").delete(deletePricingPlan);

module.exports = router;
