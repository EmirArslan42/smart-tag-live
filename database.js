let dbUrl = (process.env.TURSO_DATABASE_URL || '').trim();
if (dbUrl.startsWith('libsql://')) {
  dbUrl = dbUrl.replace('libsql://', 'https://');
}
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

// Turso Resmi REST Pipeline API Motoru
async function execute(statement) {
  let sql = typeof statement === 'string' ? statement : statement.sql;
  let args = (typeof statement === 'object' && statement.args) ? statement.args : [];

  // Parametreleri Turso formatına dönüştür
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
        {
          type: 'execute',
          stmt: {
            sql: sql,
            args: formattedArgs
          }
        },
        { type: 'close' }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Turso HTTP Hatasi (${response.status}): ${errText}`);
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
    await execute(
      "CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, edit_pin TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    await execute(
      "CREATE TABLE IF NOT EXISTS pet_profiles (tag_id TEXT PRIMARY KEY, name TEXT, breed TEXT, age TEXT, gender TEXT, chip_no TEXT, address TEXT, phone TEXT, whatsapp TEXT, health_note TEXT, photo_url TEXT)"
    );
    console.log("Turso REST API baglantisi ve tablolari basariyla hazirlandi.");
  } catch (err) {
    console.error("Tablo olusturma hatasi:", err.message);
  }
}

initTables();

module.exports = { execute };
