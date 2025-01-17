const Agenda = require('agenda');
const CachedJob = require('../model/CachedJob');
require('dotenv').config();


const MONGO_URI = process.env.MONGO_URI;
// const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbizqwv.mongodb.net/po_canda?retryWrites=true&w=majority&appName=ppc-db`

// const MONGO_URI = "mongodb+srv://bb:fresh-finest@cluster0.fbizqwv.mongodb.net/dps?retryWrites=true&w=majority&appName=ppc-db";
const agenda = new Agenda({ db: { address: MONGO_URI, collection: 'jobs' } });

const autoJobsAgenda = new Agenda({ db: { address: MONGO_URI, collection: 'autoJobs' } });


module.exports = { agenda, autoJobsAgenda };
