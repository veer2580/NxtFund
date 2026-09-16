const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database/setup');

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_PASSWORD = 'admin123';
const SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'nxtfund_serverless_secret_key';

let envPassword = process.env.ADMIN_PASSWORD || null;
let memoryPassword = null;

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[auth] ADMIN_PASSWORD not set in environment - password will come from the database or default "admin123"');
}

// ---------- Password hashing (scrypt + salt) ----------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyHashed(password, doc) {
  if (!doc || !doc.salt || !doc.hash) return false;
  try {
    const test = crypto.scryptSync(password, doc.salt, 64);
    const expected = Buffer.from(doc.hash, 'hex');
    return expected.length === test.length && crypto.timingSafeEqual(test, expected);
  } catch (err) {
    return false;
  }
}

async function getStoredPasswordDoc() {
  try {
    const db = await getDb({ skipInit: true });
    return await db.collection('settings').findOne({ setting_key: 'admin_password' });
  } catch (err) {
    return null;
  }
}

function checkEnvPassword(password) {
  const current = memoryPassword || envPassword;
  return !!current && password === current;
}

async function checkAdminPassword(password) {
  if (!password) return false;
  if (checkEnvPassword(password)) return true;
  const stored = await getStoredPasswordDoc();
  return verifyHashed(password, stored ? stored.value : null);
}

function persistAdminPasswordLocal(newPassword) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, 'utf8');
    if (/^ADMIN_PASSWORD=.*$/m.test(content)) {
      content = content.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${newPassword}`);
    } else {
      content += `\nADMIN_PASSWORD=${newPassword}\n`;
    }
    fs.writeFileSync(envPath, content);
  } catch (err) {
    console.error('[auth] Failed to persist password to .env', err);
  }
}

async function changeAdminPassword(newPassword) {
  memoryPassword = newPassword;
  persistAdminPasswordLocal(newPassword);
  try {
    const db = await getDb();
    await db.collection('settings').updateOne(
      { setting_key: 'admin_password' },
      { $set: { value: hashPassword(newPassword), updated_at: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error('[auth] Failed to persist password to database', err);
    throw err;
  }
}

// ---------- Stateless signed tokens (HMAC) ----------

function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(parts[0]).digest('base64url');
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return data.exp > Date.now();
  } catch (err) {
    return false;
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.adminToken = token;
  next();
}

const router = express.Router();

router.post('/login', async (req, res) => {
  const { password } = req.body || {};
  const ok = await checkAdminPassword(password).catch(() => false);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.json({ token: createToken() });
});

router.post('/logout', authRequired, (req, res) => {
  res.json({ message: 'Logged out' });
});

router.get('/check', authRequired, (req, res) => {
  res.json({ ok: true });
});

module.exports = { router, authRequired, checkAdminPassword, changeAdminPassword };