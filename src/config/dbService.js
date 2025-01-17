const mongoose = require("mongoose");
require("dotenv").config;
const MONGO_URI = process.env.MONGO_URI;

const DB_URIS = {
    "ATVPDKIKX0DER": MONGO_URI,
    "A2EUQ1WTGCTBG2": `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbizqwv.mongodb.net/po_canda?retryWrites=true&w=majority&appName=ppc-db`,
  };


const connectToDatabase = async (marketplaceId) => {
  console.log("passed",marketplaceId);
  let mongoUri = DB_URIS[marketplaceId];
  if (!mongoUri) {
    mongoUri = MONGO_URI
  }

  const currentConnection = mongoose.connection;

  // Check if already connected to the correct database
  if (currentConnection.readyState === 1 && currentConnection.host === new URL(mongoUri).host) {
    console.log("Already connected to the correct database.");
    return; // No need to reconnect
  }

  // Disconnect only if connected to a different database
  if (currentConnection.readyState === 1) {
    console.log("Disconnecting from current database...");
    await mongoose.disconnect();
  }

  // Establish a new connection
  console.log(`Connecting to MongoDB for marketplace: ${marketplaceId}`);
  await mongoose.connect(mongoUri);
};


module.exports ={connectToDatabase};