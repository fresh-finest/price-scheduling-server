const { fetchAccessToken } = require("../middleware/accessToken");
const axios = require("axios");

const moment = require("moment");
const { marketplace_id } = require("../middleware/credentialMiddleware");


const fetchSaeMetricsForSkus = async(skus,startDate,endDate)=>{
 const maxTries = 7;
 const delay = (ms) => new Promise((resolve)=> setTimeout(resolve,ms));
 
//  const intervalCurrent = `${startDate}T00:00:00Z--${endDate}T23:59:59Z`;
//  const intervalPrevious = `${moment(startDate).subtract(endDate - startDate, 'days').format('YYYY-MM-DD')}T00:00:00Z--${moment(endDate).subtract(endDate - startDate, 'days').format('YYYY-MM-DD')}T23:59:59Z`;
const start = moment(startDate).add(1, 'days');
const end = moment(endDate);
const daysDifference = end.diff(start, 'days')+2;

const intervalCurrent = `${start.format('YYYY-MM-DD')}T00:00:00Z--${end.format('YYYY-MM-DD')}T23:59:59Z`;
const intervalPrevious = `${start.clone().subtract(daysDifference, 'days').format('YYYY-MM-DD')}T00:00:00Z--${end.clone().subtract(daysDifference, 'days').format('YYYY-MM-DD')}T23:59:59Z`;
 
const results = [];

 for(const sku of skus){
    let metrics = { sku,currentIntervalUnits:0, previousIntervalUnits:0};

    for(let attempt = 1;attempt <=maxTries; attempt++){
        try {
            const accessToken = await fetchAccessToken();
            const url = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics`;

            const paramsCurrent ={
                marketplaceIds: marketplace_id,
                interval: intervalCurrent,
                granularity: 'Day',
                granularityTimeZone: 'America/Los_Angeles',
                sku: sku,
            }

            const responseCurrent = await axios.get(url, {
                headers: {
                    'x-amz-access-token': accessToken,
                    'x-amz-date': new Date().toISOString(),
                    'Content-Type': 'application/json',
                },
                params: paramsCurrent,
            });

            if (responseCurrent.data && responseCurrent.data.payload) {
                metrics.currentIntervalUnits = responseCurrent.data.payload.reduce(
                    (sum, metric) => sum + metric.unitCount,
                    0
                );
            }

            const paramsPrevious ={
                marketplaceIds: marketplace_id,
                interval: intervalPrevious,
                granularity: 'Day',
                granularityTimeZone: 'America/Los_Angeles',
                sku: sku,
            }
            const responsePrevious = await axios.get(url, {
                headers: {
                    'x-amz-access-token': accessToken,
                    'x-amz-date': new Date().toISOString(),
                    'Content-Type': 'application/json',
                },
                params: paramsPrevious,
            });

            if (responsePrevious.data && responsePrevious.data.payload) {
                metrics.previousIntervalUnits = responsePrevious.data.payload.reduce(
                    (sum, metric) => sum + metric.unitCount,
                    0
                );
            }
        results.push(metrics);
        break;
        } catch (error) {
            if (
                error.response &&
                error.response.data &&
                error.response.data.errors &&
                error.response.data.errors[0].code === 'QuotaExceeded'
            ) {
                console.warn(
                    `Quota exceeded for SKU: ${sku}. Attempt ${attempt} of ${maxTries}. Retrying in 3 seconds...`
                );
                await delay(3000); // Wait before retrying
                continue;
            }
            break;
        }
    }
 }

  return results;
}

module.exports = { fetchSaeMetricsForSkus };