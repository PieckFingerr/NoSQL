const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const { MongoClient } = require('mongodb');
let client;
let database;
async function connect() {
  if (database) return database;
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) throw new Error('Set MONGODB_URI and MONGODB_DB_NAME in backend/.env.');
  if (/username:password|yourcluster\.mongodb\.net|@cluster\.mongodb\.net/i.test(process.env.MONGODB_URI)) throw new Error('Set a real MONGODB_URI in backend/.env; the example URI is a placeholder.');
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    database = client.db(process.env.MONGODB_DB_NAME);
    await database.command({ ping: 1 });
    console.log('MongoDB connection succeeded.');
    return database;
  } catch (error) { await client.close(); client = undefined; throw error; }
}
function getDb() { if (!database) throw new Error('Database is not connected.'); return database; }
async function close() { if (client) await client.close(); client = undefined; database = undefined; }
// This small application runs one API process. Queue writes to serialize imports,
// restores and related business operations. Transactions provide rollback on Atlas.
let queue = Promise.resolve();
function exclusive(fn) {
  const pending = queue.then(fn);
  queue = pending.catch(() => {});
  return pending;
}
async function transaction(fn) {
  const session = client.startSession();
  try { return await session.withTransaction(() => fn(session), {
    readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary'
  }); } finally { await session.endSession(); }
}
module.exports = { connect, getDb, close, transaction, exclusive };
