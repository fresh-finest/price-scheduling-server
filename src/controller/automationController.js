const axios = require("axios");

const AddPoduct = require("../model/AddProduct");
const { create } = require("../model/CachedJob");
const Rule = require("../model/Rule");
const { createRuleWithProductService } = require("../service/automationService");

exports.createRule = async (req, res) => {
  const ruleData = req.body;

  try {
    const createRule = await Rule.create(ruleData);

    res.status(201).json({
      success: true,
      message: "Successfully created rule",
      data: createRule,
    });
  } catch (error) {
    res
      .status(500)
      .json({ errir: "Failed to create rule", details: error.message });
  }
};

exports.addProductsToRule = async (req, res) => {
  const { ruleId } = req.params;
  const { products, hitAutoPricing } = req.body;

  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ error: "Products must be an array" });
  }

  try {

   
    const rule = await Rule.findOne({ ruleId });
    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const productsToCreate = products.map((product) => ({
      ...product,
      ruleId:rule._id,
    }));

    const createdProducts = await AddPoduct.insertMany(productsToCreate);
//https://api.priceobo.com
//`http://localhost:3000
    if (hitAutoPricing) {
      const autoPricingPromises = createdProducts.map((product) =>
        axios.post(`https://api.priceobo.com/auto-pricing`, {
          sku: product.sku,
          maxPrice: product.maxPrice,
          minPrice: product.minPrice,
          percentage: rule.perchantage,
          amount: rule.amount,
          category: rule.category,
          interval: rule.interval,
        })
      );

      await Promise.all(autoPricingPromises);
    }

    res.status(201).json({
      success: true,
      message: "Products added to rule successfully",
      data: createdProducts,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to add products to rule",
      details: error.message,
    });
  }
};

exports.createRuleWithProduct= async(req,res)=>{

    const {rule, products} = req.body;


    if(!rule || !products){
        return res.status(400)/json({
            error:"Rule is required!"
        })
    }
    try {
        const {rule:createdRuele, products:createdProducts} = await createRuleWithProductService(rule, products || []);
        
        if(products && products.length > 0){
            const autoPricingPromises = createdProducts.map((product)=>

                axios.post(`https://api.priceobo.com/auto-pricing`,{
                    sku:product.sku,
                    maxPrice:product.maxPrice,
                    minPrice:product.minPrice,
                    percentage: rule.percentage,
                    amount: rule.amount,
                    category:rule.category,
                    interval:rule.interval

                })
            )
            await Promise.all(autoPricingPromises);
        }

        res.status(201).json({
            success:true,
            message:"Rule and products created successfully",
            data:{rule:createdRuele, products:createdProducts}
        })
    } catch (error) {
        res.status(500).json({
            error:"Failed to creat rule and pricing",
            details:error.message
        })
    }
}



exports.getRuleWithProductsByRuleId = async(req,res)=>{
  const {ruleId} = req.params;

  try {
    const rule = await Rule.findOne({ruleId});
    if(!rule) {
      return res.status(404).json({error:"Rule not found."});
    }

    const products = await AddPoduct.find({ruleId:rule._id});

    res.status(200).json({
      success:true,
      message:"Rule and associated product fetched successfully",
      data:{
        rule,
        products
      }
    })

  } catch (error) {
    res.status(500).json({error:"Failed to fetch rule and products", details: error.message});
  }

}

exports.getRule = async(req,res)=>{
  try {

    const rules = await Rule.find();
    res.status(200).json({
      rules
    })
    
  } catch (error) {
    res.status(500).json({
      error:error.message
    })
  }
}


/*

exports.updateProductBySku = async(req,res)=>{

  const {ruleId,sku} = req.params;
  const {maxPrice,minPrice} = req.body;

  
  try {
    const rule = await Rule.findOne({ruleId});

    if(!rule){
      return res.status(404).json({error:"Rule not found"})
    }
  
    // delete jobs from here by existing sku 
  
    await axios.post(`http://localhost:3000/auto-pricing`,{
      sku,
      maxPrice,
      minPrice,
      percentage:rule.percentage,
      amount:rule.amount,
      interval:rule.interval
    })
  } catch (error) {
    
  }
}

*/