const dayjs = require('dayjs');
const axios = require('axios');
const utc = require('dayjs/plugin/utc');
const { fetchAccessToken } = require('../middleware/accessToken');
const { marketplace_id } = require('../middleware/credentialMiddleware');
dayjs.extend(utc);

const getDynamicInterval = () => {
    const today = dayjs.utc().subtract(1, 'day'); // today in UTC
    const startOfThisMonth = today.startOf('month'); // 1st of this month
    const startOfPrevMonth = startOfThisMonth.subtract(1, 'month');
    const startOf2ndPrevMonth = startOfPrevMonth.subtract(1, 'month');
    const startOf3rdPrevMonth = startOf2ndPrevMonth.subtract(1, 'month');
    const startOf4thPrevMonth = startOf3rdPrevMonth.subtract(1, 'month');
    const startOf5thPrevMonth = startOf4thPrevMonth.subtract(1, 'month');
    const startOf6thPrevMonth = startOf5thPrevMonth.subtract(1, 'month');
    const startOf7thPrevMonth = startOf6thPrevMonth.subtract(1, 'month');
    const startOf8thPrevMonth = startOf7thPrevMonth.subtract(1, 'month');
    const startOf9thPrevMonth = startOf8thPrevMonth.subtract(1, 'month');
    const startOf10thPrevMonth = startOf9thPrevMonth.subtract(1, 'month');
    const startOf11thPrevMonth = startOf10thPrevMonth.subtract(1, 'month');
    const startOf12thPrevMonth = startOf11thPrevMonth.subtract(1, 'month');
    
    const intervalStart = startOf11thPrevMonth.startOf('month').add(1, 'day') .toISOString(); // Jan 1
    const intervalEnd = today.endOf('day').toISOString(); // March 11 23:59:59
  
    return `${intervalStart}--${intervalEnd}`;
  };
  
  const fetchOrderMetrics = async (interval) => {
    const endpoint = 'https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics';
    const maxRetries = 7;
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const accessToken = await fetchAccessToken();
  
        const request = {
          method: 'GET',
          url: endpoint,
          headers: {
            'x-amz-access-token': accessToken,
            'content-type': 'application/json',
          },
          params: {
            marketplaceIds: marketplace_id,
            interval,
            granularity: 'Day',
            granularityTimeZone: 'America/Los_Angeles',
            buyerType: 'All',
          },
        };
  
        const response = await axios(request);
        return response.data;
  
      } catch (error) {
        const isQuotaExceeded = error.response?.data?.errors?.some(
          (e) => e.code === 'QuotaExceeded'
        );
  
        if (isQuotaExceeded) {
          const waitTime = Math.pow(2, attempt) * 1000; // exponential backoff: 2s, 4s, 8s, ...
          console.warn(`QuotaExceeded - Retry attempt ${attempt}/${maxRetries} in ${waitTime / 1000}s`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          // Other errors, don't retry
          console.error('Non-retriable error:', error.response?.data || error.message);
          throw error;
        }
  
        if (attempt === maxRetries) {
          console.error('QuotaExceeded - Max retries reached.');
          throw new Error('QuotaExceeded - Failed after maximum retry attempts');
        }
      }
    }
  };
  

  module.exports = {
    getDynamicInterval,
    fetchOrderMetrics,
  };    