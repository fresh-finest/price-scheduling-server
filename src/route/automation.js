

const express = require('express');
const { createRule, addProductsToRule, createRuleWithProduct, getRuleWithProductsByRuleId, getRule } = require('../controller/automationController');

const router = express.Router();

router.post("/rules",createRule);
router.get("/rules",getRule);

router.post("/rules/:ruleId/products",addProductsToRule)

router.post("/rules-with-products",createRuleWithProduct)

router.get("/products/:ruleId",getRuleWithProductsByRuleId);

module.exports = router;