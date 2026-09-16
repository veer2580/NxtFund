require('dotenv').config();
const app = require('./app');
const { getDb } = require('./database/setup');

async function start() {
  await getDb();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`NXTFund Server running on http://localhost:${PORT}`);
    console.log(`Main Site:   http://localhost:${PORT}/`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
