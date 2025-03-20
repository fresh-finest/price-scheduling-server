const Product = require("../model/Product");
const ProductGroup = require("../model/ProductGroup");
const SaleReport = require("../model/SaleReport");


exports.createGroup = async (req, res, next) => {
  try {
    // Validate required fields
    const { name, title, imageUrl, cost } = req.body;

    if (!name || !title || !cost) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, title, imageUrl, or cost.",
      });
    }

    // Validate the `cost` field
    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost)) {
      return res.status(400).json({
        success: false,
        message: "Invalid value for 'cost'. It must be a valid number.",
      });
    }

    // Create the product group
    const result = await ProductGroup.create({
      name,
      title,
      imageUrl,
      cost: parsedCost,
    });

    res.status(201).json({
      success: true,
      message: "Product group created successfully.",
      group: result,
    });
  } catch (error) {
    // Detailed error handling
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error. Please check your input.",
        error: error.message,
      });
    }

    // Pass other errors to the error-handling middleware
    next(error);
  }
};


// exports.getGroup = async (req, res, next) => {
//   try {
//     const result = await ProductGroup.find();
//     res.json({ result });
//   } catch (error) {
//     next();
//   }
// };

exports.getGroup = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [result, totalCount] = await Promise.all([
      ProductGroup.find().skip(skip).limit(limit),
      ProductGroup.countDocuments(),
    ]);

    res.json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalResults: totalCount,
      result,
    });
  } catch (error) {
    console.error("Error fetching groups:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product groups",
    });
  }
};


exports.getGroupById = async(req,res,next)=>{
  const {id}= req.params;
  try {
    const result = await ProductGroup.findById({_id:id});
    res.status(200).json({result});
  } catch (error) {
    next(error);
  }
}

exports.updateGroup = async(req,res,next)=>{

    const {id} = req.params;
    const data = req.body;

    console.log(req.body);
    try {
        // const oldGroup = await ProductGroup.findById({_id:id});

        // if(!oldGroup){
        //     return res.status(404).json({message:"Group is not found"});
        // }

        // if(data.name && data.name !== oldGroup.name){
        //     const oldName = oldGroup.name;
        //     const newName = data.name;

        //     await SaleStock.updateMany(
        //         {"groupName.name":oldName},
        //         {$set:{"groupName.$[elem].name":newName}},
        //         {arrayFilters:[{"elem.name":oldName}]}
        //     )
        // }

        if(data.skus && Array.isArray(data.skus)){

          const invalidSkus = [];
        
          for(let skuObj of data.skus){
            const skuCode = skuObj.sku;
            const product = await Product.findOne({sellerSku:skuCode});
            if(!product){
              invalidSkus.push(skuCode);
            }
          }

          if (invalidSkus.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid SKU(s): ${invalidSkus.join(", ")}`,
            });
          }
        }

        const updateGroup = await ProductGroup.findByIdAndUpdate(
          { _id: id }, // Match by ID
          data, // Update with the request body
          { new: true, runValidators: true } // Return the updated document and enforce validation
        );
    
        // Check if the document exists
        if (!updateGroup) {
          return res.status(404).json({
            success: false,
            message: "Product group not found.",
          });
        }
    
        // Respond with success
        res.status(200).json({
          success: true,
          message: "Product group updated successfully.",
          group: updateGroup,
        });
    } catch (error) {
        next();
    }
}

exports.bulkUpdateGroups = async(req,res,next)=>{
  try {
    const updates = req.body;
    
    if(!Array.isArray(updates) || updates.length === 0){
      return res.status(400).json({
        success:false,
        message:"Request body must be a non empty array.",
      })
    }

    const results = await Promise.all(
      updates.map(async(update)=>{
        const {name,sku,uom}= update;

        if(!name || !sku || !uom){
          return {
            success:false,
            message:`Invalid update object`,
          }
        }

        const product = await Product.findOne({sellerSku:sku});

        if(!product){
          return {
            success:false,
            message:`Product not found for SKU: ${sku}`,
          }
        }

        const productGroup = await ProductGroup.findOne({name});
        console.log(productGroup);
       if(productGroup){
          const existingSkuIndex = productGroup.skus.findIndex(
            (s)=>s.sku === sku
          );
          if(existingSkuIndex !== -1){
            productGroup.skus[existingSkuIndex].uom = uom;
          }else {
            productGroup.skus.push({sku,uom});
          }

          await productGroup.save();

          return {
            success:true,
            message:`Sku map to ${name}`,
          }
        }
      })
    )

    return res.status(200).json({
      success:true,
      message:"Bulk updation completed",
      results
    })
  } catch (error) {
    res.status(500).json({
      success:false,
      message:"An error occured during the bulk update",
      error:error.message
    });
    next(error);
  }
}

exports.updateSku = async(req,res,next)=>{
  const {id} = req.params;
  const {sku,newSku,uom}= req.body;
  console.log(req.body);
  try {
    const productGroup = await ProductGroup.findById({_id:id});

    if(!productGroup){
      return res.status(404).json({
        success:false,
        message:"Product group not found."
      })
    }

    productGroup.skus = productGroup.skus.filter((item)=> item.sku !== sku);

    if(newSku){
      productGroup.skus.push({sku:newSku,uom:uom});
    }

    const updateProductGroup = await productGroup.save();

    res.status(200).json({
      success:true,
      message:newSku ? "Added new sku":"removed sku",
      updateProductGroup
    })

  } catch (error) {
    res.status(500).json({
      success:false,
      message:"An error occured while updating the sku",
      error:error.message
    })
  }
}


exports.getSkuDetails = async(req,res,next)=>{
  try {
    const {sku} = req.params;

    if(!sku){
      return res.status(400).json({
        success:false,
        message:"SKU is required!"
      })
    }

    const product = await Product.findOne({sellerSku:sku});

    if(!product){
      return res.status(404).json({
        success:false,
        message:"No data found for SKU",
      })
    }

    const responseData = {
      sku:product.sellerSku,
      imageUrl:product.imageUrl,
      title:product.itemName,
      price:product.price,
      stock: product.quantity || (product.fulfillableQuantity + product.pendingTransshipmentQuantity),
      // units: product.salesMetrics

    }

    res.status(200).json({
      success:true,
      data:responseData
    })
  } catch (error) {
    next(error)
  }
}




exports.deleteGroup = async(req,res,next)=>{
    const {id} = req.params;
    try {
        const group = await ProductGroup.findById({_id:id});

        if(!group){
            return res.status(404).json({message:"Group not found"})
        }

       await ProductGroup.deleteOne({_id:id})
       res.status(200).json({
        message:"Successfully deleted!"
       })
    } catch (error) {
        next();
    }
}



exports.getProductGroupWithSales = async(req,res,next)=>{
  try {
    const groupId = req.params.id;

    const productGroup = await ProductGroup.findById(groupId);

    if(!productGroup){
      return res.status(404).json({
        status: "Error",
        message: "Product group not found.",
      })
    }

    const skuList = productGroup.skus.map((skuObj)=>skuObj.sku);

    const saleReports = await SaleReport.aggregate([
      // {$match: {sellerSku:{$in:skuList}}},
      // {$group:{_id:"$sellerSku",totalUnits:{$sum:"$units"}}}
       // Match products by SKUs that belong to the product group
  { $match: { sellerSku: { $in: skuList } } },
  // Unwind the salesMetrics array so each metric becomes a separate document
  { $unwind: "$salesMetrics" },
  // Project a new field `saleDate` by extracting the date part from the interval
  { $project: {
      saleDate: { $substr: ["$salesMetrics.interval", 0, 10] }, // Extracts "YYYY-MM-DD"
      units: "$salesMetrics.units"
  }},
  // Group by the extracted date and sum the sales units for that date
  { $group: {
      _id: "$saleDate",          // _id is now the sale date
      totalSales: { $sum: "$units" }
  }}
    ])

    let sumOfTotalSales = 0;
    saleReports.forEach((report) => {
      sumOfTotalSales += report.totalSales;
    });

    return res.status(200).json({
      status:"Success",
      message:"Product group with sales data",
      data:{
        productGroup,
        sumOfTotalSales,
        saleReports
      }
    })
  } catch (error) {
    return res.status(500).json({
      status:"Error",
      message:error.message
    })  
  }
}

exports.searchProductGroups = async (req, res) => {
  try {
    const { uid } = req.query; // query param like ?q=syrup
    console.log(uid);
    if (!uid || !uid.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Search term is required.",
      });
    }

  
    const trimmedQuery = uid.trim();

    const result = await ProductGroup.find({
      $or: [
        { name: { $regex: trimmedQuery, $options: "i" } },
        { title: { $regex: trimmedQuery, $options: "i" } },
      ],
    });

    res.status(200).json({
      status: "success",
      result,
    });
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};


// here stock will be filtered equal, greater than , less than, not equal to
exports.groupFilterByStock = async(req,res,next)=>{
  try {
    const {stock} = req.query;
    let query = {};
    if(stock){
      query = {stock:{$gte:parseInt(stock)}}
    }
    const result = await ProductGroup.find(query);
    res.status(200).json({result}); 
  } catch (error) {
    next(error);
  } 
}

