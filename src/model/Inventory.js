const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: String,
  itemDescription: String,
  listingId: { type: String, unique: true }, 
  sellerSku: String,
  price: String,
  quantity: String,
  openDate: String,
  imageUrl: String,
  itemIsMarketplace: String,
  productIdType: String,
  zshopShippingFee: String,
  itemNote: String,
  itemCondition: String,
  zshopCategory1: String,
  zshopBrowsePath: String,
  zshopStorefrontFeature: String,
  asin1: String,
  asin2: String,
  asin3: String,
  willShipInternationally: String,
  expeditedShipping: String,
  zshopBoldface: String,
  productId: String,
  bidForFeaturedPlacement: String,
  addDelete: String,
  pendingQuantity: String,
  fulfillmentChannel: String,
  merchantShippingGroup: String,
  status: String,
}, { timestamps: true });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
