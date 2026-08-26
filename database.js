const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || ''
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      edit_pin TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pet_profiles (
      tag_id TEXT PRIMARY KEY,
      name TEXT,
      breed TEXT,
      age TEXT,
      gender TEXT,
      chip_no TEXT,
      address TEXT,
      phone TEXT,
      whatsapp TEXT,
      health_note TEXT,
      photo_url TEXT
    )
  `);

  console.log("Turso bulut veritabani tablolari basariyla hazirlandi.");
}

initDB().catch(console.error);

module.exports = db;
