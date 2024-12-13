const axios = require('axios');
const { updateClientSecret } = require('../config/spCredential');
// const { fetchAccessToken } = require('../middleware/accessToken');

const refreshAccessToken = async () => {
    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        client_id: process.env.LWA_APP_ID,
        client_secret: process.env.LWA_CLIENT_SECRET,
        refresh_token: process.env.REFRESH_TOKEN,
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error.response?.data || error.message);
    }
  };
  
const rotateClientSecret = async () => {

  try {
    const accessToken = await refreshAccessToken();
    console.log(accessToken);
    const response = await axios.post(
      'https://sellingpartnerapi-na.amazon.com/applications/2023-11-30/clientSecret',
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Replace with valid access token
          'x-amz-date': new Date().toISOString(),
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(response);
    if (response.status === 204) {
      // Simulate receiving the new secret from your queue
      const newClientSecret = 'NEW_CLIENT_SECRET_FROM_QUEUE'; // Fetch this from your queue
      updateClientSecret(newClientSecret);
    } else {
      console.error('Unexpected response:', response.data);
    }
  } catch (error) {
    console.error('Error rotating client secret:', error.response?.data || error.message);
  }
};

// rotateClientSecret();
