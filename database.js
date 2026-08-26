const { createClient } = require('@libsql/client/http');

let rawUrl = (process.env.TURSO_DATABASE_URL || '').trim();
if (rawUrl.startsWith('libsql://')) {
  rawUrl = rawUrl.replace('libsql://', 'https://');
}

const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const db = createClient({
  url: rawUrl || 'file:local.db',
  authToken: authToken || undefined
});

async function initTables() {
  try {
    await db.execute(
      "CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, edit_pin TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    await db.execute(
      "CREATE TABLE IF NOT EXISTS pet_profiles (tag_id TEXT PRIMARY KEY, name TEXT, breed TEXT, age TEXT, gender TEXT, chip_no TEXT, address TEXT, phone TEXT, whatsapp TEXT, health_note TEXT, photo_url TEXT)"
    );
    console.log("Turso HTTP baglantisi ve tablolari basariyla dogrulandi.");
  } catch (err) {
    console.error("Tablo baslatma logu:", err.message);
  }
}

initTables();

module.exports = db;
