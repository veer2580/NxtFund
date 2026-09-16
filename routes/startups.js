const express = require('express');
const { getDb, toId, serialize, serializeMany } = require('../database/setup');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const db = await getDb();
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    const startups = await db.collection('startups').find(filter).sort({ created_at: -1 }).toArray();
    res.json(serializeMany(startups));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const s = await db.collection('startups').findOne({ _id: toId(req.params.id) });
    if (!s) return res.status(404).json({ error: 'Startup not found' });
    res.json(serialize(s));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;