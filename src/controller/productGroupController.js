const Product = require("../model/Product");
const ProductGroup = require("../model/ProductGroup");


exports.createGroup = async (req, res, next) => {
  try {
    // Validate required fields
    const { name, title, imageUrl, cost } = req.body;

    if (!name || !title || !imageUrl || !cost) {
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


exports.getGroup = async (req, res, next) => {
  try {
    const result = await ProductGroup.find();
    res.json({ result });
  } catch (error) {
    next();
  }
};

// exports.getGroup = async (req, res, next) => {
//   try {
//     // Extract query parameters for pagination
//     const page = parseInt(req.query.page, 10) || 1; // Default to page 1
//     const limit = parseInt(req.query.limit, 10) || 15; // Default to 15 items per page
//     const skip = (page - 1) * limit; // Calculate the number of items to skip

//     // Fetch data with pagination
//     const result = await ProductGroup.find().skip(skip).limit(limit);

//     // Get the total count of documents
//     const totalCount = await ProductGroup.countDocuments();

//     // Return paginated results
//     res.json({
//       success: true,
//       data: result,
//       meta: {
//         totalItems: totalCount,
//         currentPage: page,
//         totalPages: Math.ceil(totalCount / limit),
//         pageSize: result.length,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

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



