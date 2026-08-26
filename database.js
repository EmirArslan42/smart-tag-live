const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./smart_tag.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      edit_pin TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
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
      photo_url TEXT,
      FOREIGN KEY(tag_id) REFERENCES tags(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS car_park_profiles (
      tag_id TEXT PRIMARY KEY,
      plate TEXT,
      status_message TEXT,
      phone TEXT,
      whatsapp TEXT,
      hide_phone INTEGER DEFAULT 0,
      FOREIGN KEY(tag_id) REFERENCES tags(id)
    )
  `);

  db.get("SELECT COUNT(*) as count FROM tags", (err, row) => {
    if (row && row.count === 0) {
      console.log("Demo kayıtlar yükleniyor...");
      
      db.run("INSERT INTO tags (id, type, title, edit_pin) VALUES ('tarcin-001', 'pet', 'Tarçın Pati Kimliği', '1234')");
      db.run(`INSERT INTO pet_profiles VALUES (
        'tarcin-001', 'TARÇIN', 'Golden Melez', '2 Yaşında', 'Erkek', '981098102938472',
        'Karanfil Sokak, Ümraniye / İstanbul', '+905321112233', '905321112233',
        'İnsan canlısıdır, ısırmaz. Düzenli alerji ilacı kullanıyor.',
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'
      )`);

      db.run("INSERT INTO tags (id, type, title, edit_pin) VALUES ('park-34abc', 'car_park', '34 ABC 789 Park QR', '5678')");
      db.run(`INSERT INTO car_park_profiles VALUES (
        'park-34abc', '34 ABC 789', 'Kısa süreli park halindeyim. Rahatsızlık verdiysem arayabilirsiniz.',
        '+905321112233', '905321112233', 0
      )`);
    }
  });
});

module.exports = db;
