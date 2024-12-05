const cron = require('node-cron');

const CachedJob = require("../model/CachedJob");
const { agenda } = require("../price-obo/Agenda");

// (async () => {
//     try {
      
//         await agenda.start();           
//         await loadAndCacheJobs();
//         cron.schedule('*/5 * * * *', async () => {
//             try {    
//                 await agenda.start();           
//                 await loadAndCacheJobs();
//             } catch (error) {
//                 console.error("Error during cron job execution:", error);
//             }
//         });

//         console.log("Cron run for CachedJob db.");
//     } catch (error) {
//         console.error("Error initializing Agenda or scheduling cron job:", error);
//     }
// })();

async function loadAndCacheJobs(){
   
    console.log("loading and storing jobs ")
    try {
        if (!agenda._collection) {
            throw new Error("Agenda collection is not initialized. Ensure Agenda is started.");
        }
        const jobs = await agenda._collection.find().toArray();

        await CachedJob.deleteMany({});
  
        const jobDocs = jobs.map(job=>({
            name:job.name,
            nextRunAt: job.nextRunAt,
            lastRunAt:job.lastRunAt,
            price:job.data?.newPrice|| job.data?.originalPrice || job.data?.revertPrice,
            data: {
                sku: job.data?.sku || "Unknown SKU",
                price:job.data?.newPrice|| job.data?.originalPrice || job.data?.revertPrice,
                scheduleId: job.data?.scheduleId || null,
            },
            failCount:job.failCount,
            updatedAt: new Date()
        }))
        await CachedJob.insertMany(jobDocs);
  
    } catch (error) {
        console.error("Error loading and caching jobs", error)
    }
  }
  
//   loadAndCacheJobs();

module.exports = loadAndCacheJobs;