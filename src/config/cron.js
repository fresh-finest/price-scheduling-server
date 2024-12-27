const cron = require("node-cron");
const { checkStockVsSales } = require("../notifications/stockAgainstSale");

const stockVsSaleCronJobs = () => {
    cron.schedule("0 0 * * *", async () => {
      console.log("Running daily stock vs. sales check...");
      await checkStockVsSales();
    });
  };

module.exports = { stockVsSaleCronJobs };





