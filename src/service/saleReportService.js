const axios = require("axios");
const { fetchAccessToken } = require("../middleware/accessToken");
const { marketplace_id } = require("../middleware/credentialMiddleware");
const SaleReport = require("../model/SaleReport");

const fetchSalesMetrics = async (sku, startDate, endDate) => {

    const maxRetries = 7;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve,ms));

    for (let i = 0; i < maxRetries; i++) {
    try {
      const accessToken = await fetchAccessToken();
      const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;
  
      const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;
  
      const params = {
        marketplaceIds:marketplace_id,
        interval: interval,
        granularity: 'Day',
        granularityTimeZone: 'America/Los_Angeles',
        sku: sku,
      };
  
      const response = await axios.get(url, {
        headers: {
          'x-amz-access-token': accessToken,
          'x-amz-date': new Date().toISOString(),
          'Content-Type': 'application/json',
        },
        params: params,
      });
  
      if (response.data && response.data.payload) {
        const metrics = response.data.payload.map(metric => ({
          interval: metric.interval,
          units: metric.unitCount,
          price: metric.averageUnitPrice ? parseFloat(metric.averageUnitPrice.amount) : 0.0,
        }));
        return metrics;
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
        if (
            error.response &&
            error.response.data &&
            error.response.data.errors &&
            error.response.data.errors[0].code === 'QuotaExceeded'
          ) {
            console.warn(`Quota exceeded for ${sku}. Attempt ${i}} of ${maxRetries}. Retrying in 2 seconds...`);
            await delay(3000); // Delay before retrying
            continue;
          }
    
          console.error('Error fetching sales metrics:', error.response ? error.response.data : error.message);
          throw error; // Throw other errors
    }
}
    throw new Error(`Failed to fetch sales metrics after ${maxRetries} attempts due to quota limits.`);
  };

  /*
const updateSaeReport = async(sku,salesMetrics)=>{
    const existingReport = await SaleReport.findOne({sellerSku:sku});
   console.log(sku);
    if(existingReport){
        salesMetrics.forEach((metric)=>{
            const existingMetric = existingReport.salesMetrics.find((m)=>m.interval === metric.interval);
            if(!existingMetric){
                existingReport.salesMetrics.push(metric);
            }
        });
        await existingReport.save();
    } else{
        await SaleReport.create({
            sellerSku:sku,
            salesMetrics
        })
    }
}
*/

const updateSaeReport = async (sku, salesMetrics) => {
  // Find the existing report for the SKU
  const existingReport = await SaleReport.findOne({ sellerSku: sku });
  console.log(sku);

  if (existingReport) {
    // Remove any existing metrics with the same intervals as the new metrics
    const newIntervals = salesMetrics.map((metric) => metric.interval);
    existingReport.salesMetrics = existingReport.salesMetrics.filter(
      (metric) => !newIntervals.includes(metric.interval)
    );

    // Add the new metrics
    existingReport.salesMetrics.push(...salesMetrics);

    // Save the updated report
    await existingReport.save();
  } else {
    // Create a new report if none exists
    await SaleReport.create({
      sellerSku: sku,
      salesMetrics,
    });
  }
};


// get total sale unit and Order unit by date range

const fetchTotalSaleUnit = async (sku, startDate, endDate) => {
  const maxRetries = 7;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve,ms));

  for (let i = 0; i < maxRetries; i++) {
  try {
    const accessToken = await fetchAccessToken();
    const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/salesUnits`;

    const interval = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;

    const params = {
      marketplaceIds:marketplace_id,
      interval: interval,
      granularity: 'Day',
      granularityTimeZone: 'America/Los_Angeles',
      sku: sku,
    };

    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': accessToken,
        'x-amz-date': new Date().toISOString(),
        'Content-Type': 'application/json',
      },
      params: params,
    });

    if (response.data && response.data.payload) {
      const metrics = response.data.payload.map(metric => ({
        interval: metric.interval,
        units: metric.unitCount,
        orders: metric.orderCount,
       
      }));
      return metrics;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
      if (
          error.response &&
          error.response.data &&
          error.response.data.errors &&
          error.response.data.errors[0].code === 'QuotaExceeded'
        ) {
          console.warn(`Quota exceeded for ${sku}. Attempt ${i}} of ${maxRetries}. Retrying in 2 seconds...`);
          await delay(3000); // Delay before retrying
          continue;
        }
  
        console.error('Error fetching sales metrics:', error.response ? error.response.data : error.message);
        throw error; // Throw other errors
  }
}
  throw new Error(`Failed to fetch sales metrics after ${maxRetries} attempts due to quota limits.`);
}
module.exports ={fetchSalesMetrics,updateSaeReport};