const express = require('express');
const { getDb, toId, serialize, serializeMany } = require('../database/setup');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const db = await getDb();
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    const blogs = await db.collection('blogs').find(filter).sort({ created_at: -1 }).toArray();
    res.json(serializeMany(blogs));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const blog = await db.collection('blogs').findOne({ _id: toId(req.params.id) });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(serialize(blog));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;