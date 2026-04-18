const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');
const seed = require('./seed');

async function ensureDbFile() {
  await fs.mkdir(path.dirname(config.dataFile), { recursive: true });
  try {
    await fs.access(config.dataFile);
  } catch {
    const seededUsers = await Promise.all(seed.users.map(async (u) => ({
      ...u,
      passwordHash: u.passwordHash || await bcrypt.hash(u.password || 'changeme123', 10),
      password: undefined,
    })));

    const initial = {
      categories: seed.categories,
      users: seededUsers,
      events: seed.events,
      notifications: [],
    };

    await fs.writeFile(config.dataFile, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function readDb() {
  await ensureDbFile();
  const raw = await fs.readFile(config.dataFile, 'utf8');
  const db = JSON.parse(raw);

  if (!Array.isArray(db.notifications)) {
    db.notifications = [];
    await writeDb(db);
  }

  return db;
}

async function writeDb(db) {
  await fs.writeFile(config.dataFile, JSON.stringify(db, null, 2), 'utf8');
}

module.exports = {
  readDb,
  writeDb,
  ensureDbFile,
};
