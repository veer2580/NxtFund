require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(
  express.json({ limit: '20mb' })
);
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filename = Date.now() + '-' + req.file.originalname.replace(/\s+/g, '-');

  try {
    const uploadsDir = process.env.NODE_ENV === 'production'
      ? path.join(require('os').tmpdir())
      : path.join(__dirname, 'assets', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    return res.json({ filename, path: `/assets/uploads/${filename}` });
  } catch (writeErr) {
    return res.status(500).json({ error: 'Upload failed' });
  }
});

const applicationRoutes = require('./routes/applications');
const eventRoutes = require('./routes/events');
const blogRoutes = require('./routes/blogs');
const startupRoutes = require('./routes/startups');
const partnerRoutes = require('./routes/partners');
const contactRoutes = require('./routes/contacts');
const { router: authRoutes } = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { getDb } = require('./database/setup');

app.use('/api/applications', applicationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);
app.get('/api/settings', async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db.collection('settings').find({ setting_key: { $ne: 'admin_password' } }).toArray();
    const stored = {};
    docs.forEach((d) => { stored[d.setting_key] = d.value; });
    res.json(stored);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.use('/api/admin', adminRoutes);

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/yc', express.static(path.join(__dirname, 'yc')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  if (filePath.endsWith('.html') && fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
});

module.exports = app;
