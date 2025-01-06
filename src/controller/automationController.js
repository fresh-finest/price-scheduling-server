const axios = require("axios");

const AddPoduct = require("../model/AddProduct");
const { create } = require("../model/CachedJob");
const Rule = require("../model/Rule");
const { createRuleWithProductService } = require("../service/automationService");
const { autoJobsAgenda } = require("../price-obo/Agenda");
const mongoose = require("mongoose");
const AutoPricingJob = require("../price-obo/JobSchedule/AutoPricingJob");

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
//https://api.priceobo.com
    if (hitAutoPricing) {
      const autoPricingPromises = createdProducts.map((product) =>
        axios.post(`https://api.priceobo.com/auto-pricing`, {
          sku: product.sku,
          maxPrice: product.maxPrice,
          minPrice: product.minPrice,
          percentage: rule.percentage,
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

  console.log(req.body);
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


exports.getRuleByRuleId=async(req,res)=>{
  const {ruleId} = req.params;
  try {
    const rules = await Rule.findOne({ruleId});

    res.status(200).json({
      success:true,
      rules
    })
  } catch (error) {
    res.status(400).json({error:error.message});
  }
}

exports.getActiveProductBySku = async(req,res)=>{
  const {sku} = req.params;
  try {
    const job = await AddPoduct.findOne({sku});
    res.status(200).json({
      success:true,
      job
    })
  } catch (error) {
    res.status(500).json({error:error.message});
  }
}

exports.getActiveJob = async(req,res)=>{
  try {
    const result = await AddPoduct.find({})
    res.status(200).json({
      success:true,
      result
    })
  } catch (error) {
    res.status(500).json({
      error:error.message
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



exports.updateProductBySku = async(req,res)=>{

  const {ruleId,sku} = req.params;
  const {maxPrice,minPrice} = req.body;
  console.log(req.body);

  try {
    const rule = await Rule.findOne({ruleId});

    if(!rule){
      return res.status(404).json({error:"Rule not found"})
    }
    const product = await AddPoduct.find({ruleId:rule._id,sku});
  console.log("product:", product);
    if(!product){
      return res.status(404).json({error:"Product is not found."});
    }
    cancelAutoJobs(sku);
  
    await axios.post(`https://api.priceobo.com/auto-pricing`,{
      sku,
      maxPrice:maxPrice|| product.maxPrice,
      minPrice:minPrice || product.minPrice,
      percentage:rule.percentage,
      amount:rule.amount,
      category:rule.category,
      interval:rule.interval
    })

    const updatedProduct = await AddPoduct.findOneAndUpdate(
      {ruleId:rule._id,sku},
      {maxPrice,minPrice},
      {new:true}
    )

    if(!updatedProduct){
      return res.status(404).json({error:"Product not found"});

    }
    res.status(200).json({
      success:true,
      message:"Updated successfully and auto pricing job triggered",
      data:updatedProduct
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({error:"Failed to updated product", details:error.message});
  }
}

 exports.deleteProductBySku = async(req,res)=>{
  const {ruleId,sku} = req.params;
  try {
    const rule = await Rule.findOne({ruleId});
    if(!rule){
      return res.status(404).json({error:"Rule not found!"});
    }
    const deletedProduct = await AddPoduct.findOneAndDelete({ruleId:rule._id,sku});

    if(!deletedProduct){
      return res.status(404).json({error:"Product is not found."});
    }
    // hit on deleting jobs
    cancelAutoJobs(sku);

    res.status(200).json({
      success:true,
      message:"Deleted successfulyl.",
      data:deletedProduct
    })
  } catch (error) {
    res.status(500).json({error:"Failed to delete produc", details:error.message})
  }
 }

 exports.pauseAutoPricing = async(req,res)=>{
  const {ruleId,sku} = req.params;

  try {
    const rule = await Rule.findOne({ruleId});

    if(!rule){
      return res.status(404).json({error:"Rule not found"});
    }
    const product = await AddPoduct.findOne({ruleId:rule._id,sku});

    if(!product){
      return res.status(404).json({error:"Product not found."});
    }

    // delete the auto pricing job just
    // await axios.delete(`api`)

    cancelAutoJobs(sku);

    res.status(200).json({
      success:true,
      message:`Successfully automation paused for product ${sku}.`
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({error:"Failed to pause automation for product ",details:error.message});
  }

 }


 exports.resumeProductAutomation = async(req,res)=>{
  const {ruleId, sku} =  req.params;
  try {
    const rule = await Rule.findOne({ruleId});
    if(!rule){
      return res.status(404).json({error:"Rule not found"});
    }
    const product = await Product.findOne({ruleId:rule._id,sku});
    if(!product){
      return res.status(404).json({error:"Product not found"});
    }

    await axios.post(`/auto-pricing`,{
      sku:product.sku,
      maxPrice:product.maxPrice,
      minPrice: product.minPrice,
      percentage:rule.percentage,
      amount: rule.amount,
      category:rule.category,
      interval:rule.interval
    })

    res.status(200).json({
      success:true,
      message:`Automation resumed for product ${sku}, auto-pricing hob created.`
    })

  } catch (error) {
    res.status(500).json({error:"Failed to resume automation for product", details:error.message});
  }
 }


exports.updateRule=async(req,res)=>{
  const {ruleId} = req.params;
  const {ruleName,percentage,amount,category,interval} = req.body;

  try {
    const updatedRule = await Rule.findOneAndUpdate(
      {ruleId},
      {ruleName,percentage,amount,category, interval},
      {new:true}
    )

    if(!updatedRule){
      return res.status(404).json({error:"Rule not found"});
    }

    const products = await AddPoduct.find({ruleId:updatedRule._id});
// delete jobs data only 
    const deleteJobPromises = products.map((product)=>{
     cancelAutoJobs(product.sku);
    })
    await Promise.all(deleteJobPromises);

    const autoPricingPromises = products.map((product)=>
      axios.post(`https://api.priceobo.com/auto-pricing`,{
        sku:product.sku,
        maxPrice:product.maxPrice,
        minPrice:product.minPrice,
        percentage,
        amount,
        category,
        interval
      })
    );
    await Promise.all(autoPricingPromises);
    res.status(200).json({
      success:true,
      message:"Rule is updated and jobs are triggered.",
      data:updatedRule
    })
  } catch (error) {
    res.status(500).json({error:"Failed to update rule", details:error.message});
  }
}

exports.deleteRule= async(req,res)=>{
  const {ruleId} = req.params;

  try {
    const rule = await Rule.findOne({ruleId});

    if(!rule){
      return res.status(404).json({error:"Rule not found."});
    }

    // const products  = await AddPoduct.find({ruleId:rule._id})
    const products = await AddPoduct.find({ruleId:rule._id});
    console.log("products: ",products);
    
    const cancelJobPromises = products.map((product)=> cancelAutoJobs(product.sku));
    await Promise.all(cancelJobPromises);

    const deleteResult = await AddPoduct.deleteMany({ ruleId: rule._id });
    // const deleteResult = await AddPoduct.deleteMany({ ruleId: mongoose.Types.ObjectId(rule._id) });

    
    console.log("Products Deleted:", deleteResult.deletedCount);

    await Rule.deleteOne({ruleId});

    res.status(200).json({
      success:true,
      message:"Rules deleted successfully."
    })
  } catch (error) {
    res.status(500).json({error:"Failed to delete rule", details:error.message});
  }
}


exports.muteRule = async(req,res)=>{
  const {ruleId} = req.params;
  try {
    const rule = await Rule.findOne({ruleId});
   

    if(!rule){
      return res.status(404).json({error:"Rule not found"});
    }

    const products = await AddPoduct.find({ruleId:rule._id});
    console.log("products: ",products);

    if(products.length ===0){
      return res.status(404).json({error:"No products found for this rule"});
    }
    await Rule.findOneAndUpdate(
      {ruleId},
      {mute:true},
      {new:true}
    )
    const cancelJobPromises = products.map((product)=> cancelAutoJobs(product.sku));

    await Promise.all(cancelJobPromises);

    res.status(200).json({
      success:true,
      message:"Rule muted successfully"
    })
    
  } catch (error) {
    res,status(500).json({error:"Failed to mute rule", details:error.message});
  }
}


exports.resumeRule = async(req,res)=>{
  const{ruleId} = req.params;
  try {
    const rule = await Rule.findOne({ruleId});
    const {percentage,amount,category,interval} = rule;
    

    if(!rule){
      return res.status(404).json({ruleId:rule._id});
    }
    const products = await AddPoduct.find({ruleId:rule._id});
    console.log("products",products);
    if(products.length ===0){
      return res.status(404).json({error:"No products found for thie rule"});
    }
    await Rule.findOneAndUpdate(
      {ruleId},
      {mute:false},
      {new:true}
    )

// await AutoPricingJob(sku,maxPrice,minPrice,percentage,amount,category,interval);
    const createJobPromises = products.map((product)=>
       AutoPricingJob(
        product.sku,
        product.maxPrice,
        product.minPrice,
        percentage,
        amount,
        category,
        interval
      )
       
    )

    await Promise.all(createJobPromises);
  // console.log(interval);
  //   const autoPricingPromises = products.map((product)=>
  //     axios.post(`https://api.priceobo.com/auto-pricing`,{
  //       sku:product.sku,
  //       maxPrice:product.maxPrice,
  //       minPrice:product.minPrice,
  //       percentage,
  //       amount,
  //       category,
  //       interval
  //     })
  //   );
  //   await Promise.all(autoPricingPromises);

    res.status(200).json({
      success:true,
      message:"Rule resumed successfully."
    })
  } catch (error) {
    res.status(500).json({error:"Failed to resume rule", details:error.message});
  }
}
const cancelAutoJobs = async(sku)=>{
    await autoJobsAgenda.cancel({'data.sku':sku});
}

