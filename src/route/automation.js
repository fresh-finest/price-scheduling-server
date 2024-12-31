

const express = require('express');
const { createRule, addProductsToRule, createRuleWithProduct, getRuleWithProductsByRuleId, getRule,updateRule,getRuleByRuleId,deleteProductBySku, updateProductBySku,deleteRule, muteRule, resumeRule, getActiveJob} = require('../controller/automationController');

const router = express.Router();

router.post("/rules",createRule);
router.get("/rules",getRule);
router.get("/active",getActiveJob);
router.post("/rules/:ruleId/products",addProductsToRule)
router.get("/rules/:ruleId",getRuleByRuleId);
router.put("/rules/:ruleId/update", updateRule)
router.delete("/rules/:ruleId/delete",deleteRule)
router.post("/rules/:ruleId/mute",muteRule)
router.post("/rules/:ruleId/resume",resumeRule)


router.post("/rules-with-products",createRuleWithProduct)

router.get("/products/:ruleId",getRuleWithProductsByRuleId);
router.delete("/products/:ruleId/:sku/delete",deleteProductBySku);
router.put("/products/:ruleId/:sku/update",updateProductBySku);


module.exports = router;