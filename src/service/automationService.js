const AddPoduct = require("../model/AddProduct");
const Rule = require("../model/Rule");

exports.createRuleWithProductService = async (ruleData, addProductsData) => {
  const createRule = await Rule.create(ruleData);

  let createdProducts = [];
  if (addProductsData.length > 0) {
    const productsToCreate = addProductsData.map((product) => ({
      ...product,
      ruleId: createRule._id,
    }));
    createdProducts = await AddPoduct.insertMany(productsToCreate);
  }

  return {rule:createRule, products:createdProducts};
};


exports.updateProductByIdService = async(id)=>{

}