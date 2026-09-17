require('dotenv').config();
const { getDb } = require('./setup');
const { EVENT_DEFAULTS } = require('./events-data');

async function syncEvents() {
  const db = await getDb();
  await db.collection('events').deleteMany({});
  for (const e of EVENT_DEFAULTS) {
    await db.collection('events').insertOne({ ...e, created_at: new Date() });
  }
  console.log(`Events synced: events collection reset to ${EVENT_DEFAULTS.length} default events`);
  process.exit(0);
}

syncEvents().catch((err) => { console.error('Sync failed:', err.message); process.exit(1); });