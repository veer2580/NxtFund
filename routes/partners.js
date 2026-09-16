const express = require('express');
const { getDb, toId, serialize, serializeMany } = require('../database/setup');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const db = await getDb();
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    const partners = await db.collection('partners').find(filter).sort({ created_at: -1 }).toArray();
    res.json(serializeMany(partners));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const p = await db.collection('partners').findOne({ _id: toId(req.params.id) });
    if (!p) return res.status(404).json({ error: 'Partner not found' });
    res.json(serialize(p));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;