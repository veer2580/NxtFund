const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const DB_NAME = process.env.MONGODB_DB || 'nxtfund';

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
});

let db = null;
let connected = false;

async function connect() {
  if (connected && db) return db;
  await client.connect();
  db = client.db(DB_NAME);
  connected = true;
  return db;
}

function toId(id) {
  try {
    return typeof id === 'string' ? new ObjectId(id) : id;
  } catch (err) {
    return null;
  }
}

function serialize(doc) {
  if (!doc) return doc;
  const out = { ...doc };
  if (out._id) {
    out.id = out._id.toString();
    delete out._id;
  }
  return out;
}

function serializeMany(docs) {
  return (docs || []).map(serialize);
}

async function ensureInit(db) {
  await db.collection('settings').createIndex({ setting_key: 1 }, { unique: true });
}

async function getDb(options = {}) {
  const database = await connect();
  if (!options.skipInit) {
    await ensureInit(database);
  }
  return database;
}

module.exports = { getDb, connect, toId, serialize, serializeMany, ObjectId };
