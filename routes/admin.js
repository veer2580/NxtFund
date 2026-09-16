const express = require('express');
const { getDb, toId, serialize, serializeMany } = require('../database/setup');
const { authRequired, checkAdminPassword, changeAdminPassword } = require('./auth');

const router = express.Router();
router.use(authRequired);

const CONTACT_STATUSES = ['unread', 'read', 'replied'];
const APP_STATUSES = ['pending', 'reviewed', 'accepted', 'rejected'];
const REG_STATUSES = ['new', 'reviewed', 'contacted'];

const CONTENT_TYPES = ['events', 'blogs', 'startups', 'partners'];

const CONTENT_SCHEMAS = {
  events: {
    allowed: ['title', 'description', 'date', 'time', 'location', 'type', 'image_url', 'link'],
    search: ['title', 'description', 'location']
  },
  blogs: {
    allowed: ['title', 'excerpt', 'content', 'author', 'image_url', 'status'],
    search: ['title', 'excerpt', 'author']
  },
  startups: {
    allowed: ['name', 'description', 'sector', 'website', 'status'],
    search: ['name', 'description', 'sector']
  },
  partners: {
    allowed: ['name', 'description', 'category', 'website', 'logo_url'],
    search: ['name', 'description', 'category']
  }
};

const DEFAULT_SETTINGS = {
  hero_title: 'We Fund the Bold',
  hero_subtitle: 'NXTFund backs early-stage founders building world-class startups.',
  contact_email: 'hello@nxtfund.in',
  contact_phone: '',
  contact_location: '',
  social_twitter: '',
  social_linkedin: '',
  social_instagram: '',
  announcement: ''
};

function sanitizeFields(body, allowed) {
  const out = {};
  if (!body || typeof body !== 'object') return out;
  allowed.forEach((key) => {
    if (body[key] !== undefined) out[key] = body[key];
  });
  return out;
}

function buildSearchFilter(query, schema, extra) {
  const filter = {};
  if (query.status && ['all', 'unread', 'read', 'replied', 'pending', 'reviewed', 'accepted', 'rejected', 'published', 'draft', 'active', 'inactive', 'upcoming', 'past'].includes(query.status)) {
    filter.status = query.status;
  }
  if (query.type && query.type !== 'all') filter.type = query.type;
  const q = (query.q || '').trim();
  if (q) {
    const rx = new RegExp(q, 'i');
    const fields = (schema && schema.search) || ['name', 'title', 'description'];
    const ors = fields.map((f) => ({ [f]: rx }));
    if (extra) ors.push(...extra);
    filter.$or = ors;
  }
  return filter;
}

// ======================= Admin password =======================

const PASSWORD_REGEX = /^[A-Za-z0-9@#$%^&*_\-+=.!]{8,64}$/;

router.post('/password', async (req, res) => {
  const { current_password, new_password } = req.body || {};
  const ok = await checkAdminPassword(current_password).catch(() => false);
  if (!ok) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!new_password || !PASSWORD_REGEX.test(new_password)) {
    return res.status(400).json({ error: 'New password must be 8-64 characters (letters, numbers, and symbols only)' });
  }
  try {
    await changeAdminPassword(new_password);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Could not save the password. Please try again.' });
  }
});

// ======================= Stats =======================

router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();
    const statusFields = {
      contacts: CONTACT_STATUSES,
      applications: APP_STATUSES,
      event_registrations: REG_STATUSES,
      blogs: ['published', 'draft'],
      startups: ['active', 'inactive'],
      events: ['upcoming', 'past'],
      partners: ['Corporate', 'VCs', 'Accelerators', 'Advisors']
    };
    const counts = {};
    for (const coll of ['contacts', 'applications', 'event_registrations', 'events', 'blogs', 'startups', 'partners']) {
      counts[coll] = {};
      counts[coll].total = await db.collection(coll).countDocuments();
      for (const s of (statusFields[coll] || [])) {
        counts[coll][s] = await db.collection(coll).countDocuments({ status: s });
      }
    }
    const recentContacts = serializeMany(
      await db.collection('contacts').find().sort({ created_at: -1 }).limit(5).toArray()
    );
    const recentApplications = serializeMany(
      await db.collection('applications').find().sort({ submitted_at: -1 }).limit(5).toArray()
    );
    const recentRegistrations = serializeMany(
      await db.collection('event_registrations').find().sort({ submitted_at: -1 }).limit(5).toArray()
    );
    res.json({ counts, recentContacts, recentApplications, recentRegistrations });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= Content CRUD (events/blogs/startups/partners) =======================

router.get('/content/:type', async (req, res) => {
  try {
    const type = req.params.type;
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid content type' });
    const db = await getDb();
    const filter = buildSearchFilter(req.query, CONTENT_SCHEMAS[type]);
    const sortKey = type === 'events' ? { date: -1 } : { created_at: -1 };
    const items = await db.collection(type).find(filter).sort(sortKey).toArray();
    res.json(serializeMany(items));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/content/:type/:id', async (req, res) => {
  try {
    const type = req.params.type;
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid content type' });
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await db.collection(type).findOne({ _id: toId(req.params.id) });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/content/:type', async (req, res) => {
  try {
    const type = req.params.type;
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid content type' });
    const allowed = CONTENT_SCHEMAS[type].allowed;
    const data = sanitizeFields(req.body || {}, allowed);
    const required = type === 'events' ? 'title' : type === 'blogs' ? 'title' : type === 'startups' ? 'name' : 'name';
    if (!data[required] || String(data[required]).trim() === '') {
      return res.status(400).json({ error: `${required} is required` });
    }
    const db = await getDb();
    const doc = Object.assign({}, data, { created_at: new Date(), updated_at: new Date() });
    const r = await db.collection(type).insertOne(doc);
    res.status(201).json(serialize(Object.assign({ _id: r.insertedId }, doc)));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/content/:type/:id', async (req, res) => {
  try {
    const type = req.params.type;
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid content type' });
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const allowed = CONTENT_SCHEMAS[type].allowed;
    const data = sanitizeFields(req.body || {}, allowed);
    data.updated_at = new Date();
    const r = await db.collection(type).updateOne({ _id: toId(req.params.id) }, { $set: data });
    if (!r.matchedCount) return res.status(404).json({ error: 'Not found' });
    const item = await db.collection(type).findOne({ _id: toId(req.params.id) });
    res.json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/content/:type/:id', async (req, res) => {
  try {
    const type = req.params.type;
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid content type' });
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.collection(type).deleteOne({ _id: toId(req.params.id) });
    if (!r.deletedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: `${type.slice(0, -1)} deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= Contacts =======================

router.get('/contacts', async (req, res) => {
  try {
    const db = await getDb();
    const filter = buildSearchFilter(req.query, {
      search: ['name', 'email', 'subject', 'message']
    });
    const items = await db.collection('contacts').find(filter).sort({ created_at: -1 }).toArray();
    res.json(serializeMany(items));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/contacts/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await db.collection('contacts').findOne({ _id: toId(req.params.id) });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/contacts/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!CONTACT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const db = await getDb();
    const r = await db.collection('contacts').updateOne(
      { _id: toId(req.params.id) },
      { $set: { status } }
    );
    if (!r.matchedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Contact updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.collection('contacts').deleteOne({ _id: toId(req.params.id) });
    if (!r.deletedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= Applications =======================

router.get('/applications', async (req, res) => {
  try {
    const db = await getDb();
    const filter = buildSearchFilter(req.query, {
      search: ['company_name', 'founder_name', 'founder_email', 'company_description']
    });
    const items = await db.collection('applications').find(filter).sort({ submitted_at: -1 }).toArray();
    res.json(serializeMany(items));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await db.collection('applications').findOne({ _id: toId(req.params.id) });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/applications/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!APP_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const db = await getDb();
    const r = await db.collection('applications').updateOne(
      { _id: toId(req.params.id) },
      { $set: { status } }
    );
    if (!r.matchedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Application updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/applications/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.collection('applications').deleteOne({ _id: toId(req.params.id) });
    if (!r.deletedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Application deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= Event Registrations =======================

router.get('/registrations', async (req, res) => {
  try {
    const db = await getDb();
    const filter = buildSearchFilter(req.query, {
      search: ['full_name', 'email', 'mobile', 'company_name', 'city', 'attendee_type']
    });
    const items = await db.collection('event_registrations').find(filter).sort({ submitted_at: -1 }).toArray();
    res.json(serializeMany(items));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/registrations/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await db.collection('event_registrations').findOne({ _id: toId(req.params.id) });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/registrations/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!REG_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const db = await getDb();
    const r = await db.collection('event_registrations').updateOne(
      { _id: toId(req.params.id) },
      { $set: { status } }
    );
    if (!r.matchedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Registration updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/registrations/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!toId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.collection('event_registrations').deleteOne({ _id: toId(req.params.id) });
    if (!r.deletedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Registration deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= Settings =======================

router.get('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db.collection('settings').find({ setting_key: { $ne: 'admin_password' } }).toArray();
    const stored = {};
    docs.forEach((d) => { stored[d.setting_key] = d.value; });
    const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const body = req.body || {};
    const db = await getDb();
    let changed = 0;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (body[key] !== undefined) {
        const value = typeof body[key] === 'string' ? body[key] : String(body[key] == null ? '' : body[key]);
        await db.collection('settings').updateOne(
          { setting_key: key },
          { $set: { value, updated_at: new Date() } },
          { upsert: true }
        );
        changed++;
      }
    }
    res.json({ message: `${changed} settings saved` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;