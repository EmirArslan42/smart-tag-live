let dbUrl = (process.env.TURSO_DATABASE_URL || '').trim();
if (dbUrl.startsWith('libsql://')) {
  dbUrl = dbUrl.replace('libsql://', 'https://');
}
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

async function execute(statement) {
  let sql = typeof statement === 'string' ? statement : statement.sql;
  let args = (typeof statement === 'object' && statement.args) ? statement.args : [];

  const formattedArgs = args.map(arg => {
    if (arg === null || arg === undefined) return { type: 'null' };
    if (typeof arg === 'number') return { type: 'integer', value: String(arg) };
    return { type: 'text', value: String(arg) };
  });

  const response = await fetch(`${dbUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: formattedArgs } },
        { type: 'close' }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Turso Hatasi (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const execResult = data.results[0];

  if (execResult.type === 'error') {
    throw new Error(execResult.error.message);
  }

  const resultCols = execResult.response.result.cols.map(c => c.name);
  const rows = execResult.response.result.rows.map(row => {
    let obj = {};
    row.forEach((val, idx) => {
      obj[resultCols[idx]] = val ? val.value : null;
    });
    return obj;
  });

  return { rows };
}

async function initTables() {
  try {
    // Ana etiketler
    await execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        edit_pin TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pati
    await execute(`
      CREATE TABLE IF NOT EXISTS pet_profiles (
        tag_id TEXT PRIMARY KEY,
        name TEXT, breed TEXT, age TEXT, gender TEXT, chip_no TEXT,
        address TEXT, phone TEXT, whatsapp TEXT, health_note TEXT, photo_url TEXT
      )
    `);

    // Araç Park
    await execute(`
      CREATE TABLE IF NOT EXISTS car_park_profiles (
        tag_id TEXT PRIMARY KEY,
        plate TEXT, status_message TEXT, phone TEXT, whatsapp TEXT, hide_phone INTEGER DEFAULT 0
      )
    `);

    // Araç Bakım & Servis
    await execute(`
      CREATE TABLE IF NOT EXISTS vehicle_service_profiles (
        tag_id TEXT PRIMARY KEY,
        plate TEXT, vehicle_model TEXT, last_service_km TEXT, next_service_km TEXT,
        last_service_date TEXT, notes TEXT, phone TEXT
      )
    `);

    // Valiz / Seyahat
    await execute(`
      CREATE TABLE IF NOT EXISTS luggage_profiles (
        tag_id TEXT PRIMARY KEY,
        owner_name TEXT, flight_no TEXT, hotel_address TEXT, phone TEXT, whatsapp TEXT, reward_note TEXT
      )
    `);

    // Sosyal Medya / Kartvizit
    await execute(`
      CREATE TABLE IF NOT EXISTS bio_profiles (
        tag_id TEXT PRIMARY KEY,
        full_name TEXT, title TEXT, bio_note TEXT, instagram TEXT, linkedin TEXT, youtube TEXT, website TEXT, phone TEXT, photo_url TEXT
      )
    `);

    console.log("Tum Smart Tag modulleri ve veritabani tablolari hazir.");
  } catch (err) {
    console.error("Tablo baslatma logu:", err.message);
  }
}

initTables();

module.exports = { execute };
