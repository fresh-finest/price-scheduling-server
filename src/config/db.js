const mongoose = require("mongoose");
const colors = require("colors");
require("dotenv").config();

const OWNER_URI = process.env.OWNER_URI;


const ownerDb = mongoose.createConnection(OWNER_URI);
ownerDb.on("connected", () => {
  console.log("Connected to Owner MongoDB!".green.bold);
});

ownerDb.on("error", (err) => {
  console.error("Error connecting to Owner MongoDB:".red.bold, err);
});

  module.exports=ownerDb;