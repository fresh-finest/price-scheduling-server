const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemName: { type: String, trim: true },
  itemDescription: { type: String, trim: true },
  listingId: { type: String, unique: true, required: true }, // Unique identifier for the listing
  sellerSku:{type: String},
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  openDate: { type: String },
  imageUrl: { type: String, trim: true },
  itemIsMarketplace: { type: String, trim: true },
  productIdType: { type: String, trim: true },
  zshopShippingFee: { type: String, trim: true },
  itemNote: { type: String, trim: true },
  itemCondition: { type: String, trim: true },
  zshopCategory1: { type: String, trim: true },
  zshopBrowsePath: { type: String, trim: true },
  zshopStorefrontFeature: { type: String, trim: true },
  asin1: { type: String, trim: true },
  asin2: { type: String, trim: true },
  asin3: { type: String, trim: true },
  willShipInternationally: { type: String, trim: true },
  expeditedShipping: { type: String, trim: true },
  zshopBoldface: { type: String, trim: true },
  productId: { type: String, trim: true },
  bidForFeaturedPlacement: { type: String, trim: true },
  addDelete: { type: String, trim: true },
  pendingQuantity: { type: Number, default: 0 },
  fulfillmentChannel: { type: String, trim: true },
  merchantShippingGroup: { type: String, trim: true },
  status: { type: String, trim: true },
  fulfillableQuantity: { type: Number}, 
  pendingTransshipmentQuantity: { type: Number},
 
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const MergedProduct = mongoose.model('MergedProduct', productSchema);

module.exports = MergedProduct;
