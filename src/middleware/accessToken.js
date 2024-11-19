
const axios = require('axios');

const credentials = require('./credentialMiddleware');

exports.fetchAccessToken = async (req) => {
    const { lwa_app_id, lwa_client_secret, refresh_token } = credentials;
  
    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: lwa_app_id,
        client_secret: lwa_client_secret,
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error.response ? error.response.data : error.message);
      throw error;
    }
  };