require('dotenv').config();
const app = require('../app');
const { getDb } = require('../database/setup');

let initPromise = null;

function init() {
  if (!initPromise) {
    initPromise = getDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

module.exports = async (req, res) => {
  await init();
  app(req, res);
};