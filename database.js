const { createClient } = require('@libsql/client');

const url = (process.env.TURSO_DATABASE_URL || '').trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const db = createClient({
  url: url || 'file:local.db',
  authToken: authToken || undefined
});

async function initTables() {
  try {
    // Tags Tablosu
    await db.execute(
      "CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, edit_pin TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    // Pet Profilleri Tablosu
    await db.execute(
      "CREATE TABLE IF NOT EXISTS pet_profiles (tag_id TEXT PRIMARY KEY, name TEXT, breed TEXT, age TEXT, gender TEXT, chip_no TEXT, address TEXT, phone TEXT, whatsapp TEXT, health_note TEXT, photo_url TEXT)"
    );
    console.log("Turso bulut veritabani tablolari hazir ve baglanti basarili.");
  } catch (err) {
    console.error("Tablo baslatma uyarisi (onemsiz olabilir):", err.message);
  }
}

// Sunucu baslarken tablolari olustur
initTables();

module.exports = db;
