const express = require('express');
const { getDb } = require('../database/setup');
const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message, file_name } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const db = await getDb();
    await db.collection('contacts').insertOne({
      name, email, subject, message, file_name: file_name || null,
      status: 'unread',
      created_at: new Date()
    });
    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;