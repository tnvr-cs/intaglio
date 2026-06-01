// Simple Node server: login, save spending data, collect ML feedback.
// Run with: node server.js  (listens on port 3000)

const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.txt');
const DATA_DIR = path.join(__dirname, 'data');
const ML_FEEDBACK_FILE = path.join(DATA_DIR, 'ml-feedback.json');

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/intaglio-app.html', (req, res) => {
  res.redirect('/');
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// users.txt format: email|password|name  (lines starting with # are ignored)
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const raw = fs.readFileSync(USERS_FILE, 'utf8');
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [email, password, name] = line.split('|');
      return { email: (email || '').trim(), password: (password || '').trim(), name: (name || '').trim() };
    })
    .filter(u => u.email && u.password && u.name);
}

function writeUsers(users) {
  const header = '# users — email|password|name\n\n';
  const body = users.map(u => `${u.email}|${u.password}|${u.name}`).join('\n');
  fs.writeFileSync(USERS_FILE, header + body + (body ? '\n' : ''), 'utf8');
}

function findUser(email, password) {
  const needle = email.trim().toLowerCase();
  return readUsers().find(u => u.email.toLowerCase() === needle && u.password === password);
}

function findUserByEmail(email) {
  const needle = email.trim().toLowerCase();
  return readUsers().find(u => u.email.toLowerCase() === needle);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function emailToFilename(email) {
  return email.trim().toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_') + '.json';
}

function userDataPath(email) {
  return path.join(DATA_DIR, emailToFilename(email));
}

function readUserData(email) {
  ensureDataDir();
  const file = userDataPath(email);
  if (!fs.existsSync(file)) {
    return { email: email.trim(), months: {}, onboardingComplete: false };
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.onboardingComplete === undefined) {
      const hasMonths = data.months && Object.keys(data.months).length > 0;
      data.onboardingComplete = hasMonths;
    }
    return data;
  } catch {
    return { email: email.trim(), months: {}, onboardingComplete: false };
  }
}

function writeUserData(email, data) {
  ensureDataDir();
  fs.writeFileSync(userDataPath(email), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

app.post('/api/register', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const password = req.body.password || '';

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Please fill in all fields.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });
  }

  const users = readUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
  }

  users.push({ email, password, name });
  writeUsers(users);
  writeUserData(email, { email, name, months: {}, onboardingComplete: false });
  res.json({ ok: true, user: { email, name, needsOnboarding: true } });
});

app.post('/api/login', (req, res) => {
  const email = (req.body.email || '').trim();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Please fill in all fields.' });
  }

  const user = findUser(email, password);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
  }

  res.json({ ok: true, user: { email: user.email, name: user.name } });
});

app.get('/api/data/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email || '').trim();
  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required.' });
  }
  if (!findUserByEmail(email)) {
    return res.status(404).json({ ok: false, error: 'User not found.' });
  }
  res.json({ ok: true, data: readUserData(email) });
});

function readMlFeedback() {
  ensureDataDir();
  if (!fs.existsSync(ML_FEEDBACK_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ML_FEEDBACK_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function appendMlFeedback(entry) {
  const items = readMlFeedback();
  const key = `${entry.description}|${entry.categoryIndex}`;
  const exists = items.some(
    (r) => `${r.description}|${r.categoryIndex}` === key,
  );
  if (!exists) items.push(entry);
  if (items.length > 500) items.splice(0, items.length - 500);
  fs.writeFileSync(ML_FEEDBACK_FILE, JSON.stringify(items, null, 2) + '\n', 'utf8');
}

app.post('/api/ml/feedback', (req, res) => {
  const description = (req.body.description || '').trim();
  const categoryIndex = req.body.categoryIndex;

  if (!description || categoryIndex === undefined || categoryIndex === null) {
    return res.status(400).json({ ok: false, error: 'Invalid feedback.' });
  }
  if (categoryIndex < 0 || categoryIndex > 7 || !Number.isInteger(categoryIndex)) {
    return res.status(400).json({ ok: false, error: 'Invalid category.' });
  }

  appendMlFeedback({
    description,
    categoryIndex,
    at: req.body.at || new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.post('/api/onboarding/complete', (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required.' });
  }
  if (!findUserByEmail(email)) {
    return res.status(404).json({ ok: false, error: 'User not found.' });
  }
  const store = readUserData(email);
  store.onboardingComplete = true;
  writeUserData(email, store);
  res.json({ ok: true });
});

app.put('/api/data', (req, res) => {
  const email = (req.body.email || '').trim();
  const month = req.body.month;
  const monthData = req.body.data;

  if (!email || month === undefined || month === null || !Array.isArray(monthData)) {
    return res.status(400).json({ ok: false, error: 'Invalid save request.' });
  }
  if (!findUserByEmail(email)) {
    return res.status(404).json({ ok: false, error: 'User not found.' });
  }

  const store = readUserData(email);
  store.months[String(month)] = monthData;
  writeUserData(email, store);
  res.json({ ok: true });
});

function networkUrls(port) {
  const urls = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const net of ifaces || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`intaglio at http://localhost:${PORT}`);
  for (const url of networkUrls(PORT)) {
    console.log(`  phone (same Wi-Fi): ${url}`);
  }
});
