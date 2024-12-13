require('dotenv').config();
const fs = require('fs');

module.exports = {
  refresh_token: process.env.REFRESH_TOKEN,
  lwa_app_id: process.env.LWA_APP_ID,
  get lwa_client_secret() {
    return process.env.LWA_CLIENT_SECRET; // Dynamically access client secret
  },
  seller_id: process.env.SELLER_ID,
  marketplace_id: process.env.MARKETPLACE_ID,
  updateClientSecret: function (newSecret) {
    const envPath = '.env';
    const envFile = fs.readFileSync(envPath, 'utf8');
    const updatedEnvFile = envFile.replace(
      /LWA_CLIENT_SECRET=.*/,
      `LWA_CLIENT_SECRET=${newSecret}`
    );
    fs.writeFileSync(envPath, updatedEnvFile);
    console.log('Client secret updated successfully in .env');
  },
};
