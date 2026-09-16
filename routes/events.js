const express = require('express');
const { getDb, toId, serialize, serializeMany } = require('../database/setup');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const db = await getDb();
    const filter = {};
    if (type && type !== 'all') filter.type = type;
    const events = await db.collection('events').find(filter).sort({ date: -1 }).toArray();
    res.json(serializeMany(events));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const d = req.body || {};
    const { full_name, email, mobile, company_name, designation, city, linkedin, attendee_type, website, interests } = d;
    if (!full_name || !email) return res.status(400).json({ error: 'Full name and email are required' });
    const db = await getDb();
    await db.collection('event_registrations').insertOne({
      full_name,
      email,
      mobile: mobile || null,
      company_name: company_name || null,
      designation: designation || null,
      city: city || null,
      linkedin: linkedin || null,
      attendee_type: attendee_type || null,
      website: website || null,
      interests: interests || null,
      event_title: 'NXTFund Demo Day',
      status: 'new',
      submitted_at: new Date()
    });
    res.json({ message: 'Registration submitted successfully' });
  } catch (err) {
    console.error('Event register error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const event = await db.collection('events').findOne({ _id: toId(req.params.id) });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(serialize(event));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;