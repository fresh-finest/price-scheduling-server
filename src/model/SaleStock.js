const mongoose = require('mongoose');

// Stock schema for product information
const saleStockSchema = new mongoose.Schema({
  itemName: { type: String, trim: true },
  itemDescription: { type: String, trim: true },
  listingId: { type: String, unique: true, required: true },  // Listing ID is required and unique
  sellerSku: { type: String, required: true, trim: true },  // SKU is required
  fnSku: { type: String },
  price: { type: Number, default: 0 },  // Default price is 0
  quantity: { type: Number, default: 0 },  // Default quantity is 0
  openDate: { type: String },  // Consider changing to Date type for easier handling of dates
  imageUrl: { type: String, trim: true },  // Image URL
  itemIsMarketplace: { type: String, trim: true },
  productIdType: { type: String, trim: true },
  zshopShippingFee: { type: String, trim: true },
  itemNote: { type: String, trim: true },
  itemCondition: { type: String, trim: true },
  zshopCategory1: { type: String, trim: true },
  zshopBrowsePath: { type: String, trim: true },
  zshopStorefrontFeature: { type: String, trim: true },
  asin1: { type: String, required: true, trim: true },  // ASIN1 is required for product identification
  asin2: { type: String, trim: true },  // Optional fields for additional ASINs
  asin3: { type: String, trim: true },
  willShipInternationally: { type: String, trim: true },
  expeditedShipping: { type: String, trim: true },
  zshopBoldface: { type: String, trim: true },
  productId: { type: String, sparse: true, unique: true, trim: true },  // Optional but unique productId, with sparse index
  bidForFeaturedPlacement: { type: String, trim: true },
  addDelete: { type: String, trim: true },
  pendingQuantity: { type: Number, default: 0 },  // Default pending quantity is 0
  fulfillmentChannel: { type: String, trim: true },
  merchantShippingGroup: { type: String, trim: true },
  status: { type: String, trim: true },  // Product status
  fulfillableQuantity: { type: Number, default: 0 },  // Default to 0 if not provided
  pendingTransshipmentQuantity: { type: Number, default: 0 },  // Default to 0 if not provided

  // New field for storing sales metrics
  salesMetrics: [
    {
      time: { type: String, required: true },  // e.g., "1 Day", "7 Days", etc.
      totalUnits: { type: Number, required: true },  // Total units sold during this period
      totalSalesAmount: { type: String, required: true },  // Total sales amount as a string to preserve formatting (e.g., 2 decimal places)
    }
  ]
}, { timestamps: true });  // Automatically adds createdAt and updatedAt fields

const SaleStock = mongoose.model('SaleStock', saleStockSchema);

module.exports = SaleStock;
