// services/inventoryService.js

require('dotenv').config();
const axios = require('axios');
const zlib = require('zlib');
const { parse } = require('csv-parse/sync');
const Inventory = require('../model/Inventory'); // Adjust the path according to your project structure
const moment = require('moment-timezone');

// Credentials setup
const credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  lwa_client_secret: process.env.LWA_CLIENT_SECRET,
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
};

// Fetch access token
const fetchAccessToken = async () => {
  try {
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: credentials.lwa_app_id,
      client_secret: credentials.lwa_client_secret,
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Create a report
const createReport = async () => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = '/reports/2021-06-30/reports';
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'POST',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
    data: {
      reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
      marketplaceIds: [credentials.marketplace_id],
      reportOptions: {
        custom: "true",
      }
    },
  };

  console.log('Requesting All Listings report creation');

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('Error creating report:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Get report status
const getReportStatus = async (reportId) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/reports/2021-06-30/reports/${reportId}`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
  };

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('Error fetching report status:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Get report document
const getReportDocument = async (reportDocumentId) => {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/reports/2021-06-30/documents/${reportDocumentId}`;
  const accessToken = await fetchAccessToken();

  const request = {
    method: 'GET',
    url: `${endpoint}${path}`,
    headers: {
      'x-amz-access-token': accessToken,
      'content-type': 'application/json',
    },
  };

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('Error fetching report document:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Save report data to MongoDB
const saveReportData = async (organizedData) => {
  for (const record of organizedData) {
    await Inventory.updateOne(
      { listingId: record.listingId }, // Unique identifier to prevent duplicates
      { $set: record },                // Update with the latest data
      { upsert: true }                 // Insert if it doesn't exist
    );
  }

  console.log('Report data processed and saved to MongoDB.');
};

// Download report data
const downloadReportData = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const decompressedData = zlib.gunzipSync(buffer).toString('utf-8');
    const parsedData = parseTSV(decompressedData);
    const organizedData = organizeListingData(parsedData);

    await saveReportData(organizedData);

    return organizedData;
  } catch (error) {
    console.error('Error downloading report data:', error.message);
    throw error;
  }
};

// Parse TSV data
const parseTSV = (tsvData) => {
  const records = parse(tsvData, {
    delimiter: '\t',
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  });
  return records;
};

// Organize listing data
const organizeListingData = (parsedData) => {
  return parsedData.map((record) => {
    return {
      itemName: record['item-name'],
      itemDescription: record['item-description'],
      listingId: record['listing-id'],
      sellerSku: record['seller-sku'],
      price: record['price'],
      quantity: record['quantity'],
      openDate: record['open-date'],
      imageUrl: record['image-url'],
      itemIsMarketplace: record['item-is-marketplace'],
      productIdType: record['product-id-type'],
      zshopShippingFee: record['zshop-shipping-fee'],
      itemNote: record['item-note'],
      itemCondition: record['item-condition'],
      zshopCategory1: record['zshop-category1'],
      zshopBrowsePath: record['zshop-browse-path'],
      zshopStorefrontFeature: record['zshop-storefront-feature'],
      asin1: record['asin1'],
      asin2: record['asin2'],
      asin3: record['asin3'],
      willShipInternationally: record['will-ship-internationally'],
      expeditedShipping: record['expedited-shipping'],
      zshopBoldface: record['zshop-boldface'],
      productId: record['product-id'],
      bidForFeaturedPlacement: record['bid-for-featured-placement'],
      addDelete: record['add-delete'],
      pendingQuantity: record['pending-quantity'],
      fulfillmentChannel: record['fulfillment-channel'],
      merchantShippingGroup: record['merchant-shipping-group'],
      status: record['status'],
    };
  });
};

// Function to initiate the report fetching and processing
const fetchAndDownloadDataOnce = async () => {
  try {
    console.log('Starting the report download process...');

    const createReportResponse = await createReport();
    const reportId = createReportResponse.reportId;

    let reportStatus;
    let reportStatusResponse;

    let interval = 5000; // 5 seconds

    do {
      await new Promise(resolve => setTimeout(resolve, interval));
      reportStatusResponse = await getReportStatus(reportId);
      reportStatus = reportStatusResponse.processingStatus;
      console.log('Report status:', reportStatus);

      if (interval < 60000) interval += 5000; // Increase interval gradually
    } while (reportStatus !== 'DONE');

    const reportDocumentResponse = await getReportDocument(reportStatusResponse.reportDocumentId);
    await downloadReportData(reportDocumentResponse.url);

    console.log('Report download completed successfully.');
  } catch (error) {
    console.error('Error during report download process:', error);
  }
};

// Export the fetchAndDownloadDataOnce function to be used in index.js
module.exports = {
  fetchAndDownloadDataOnce,
};
