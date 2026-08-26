const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function trToEn(text) {
  if (!text) return '';
  return String(text)
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

const getCommonCSS = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { background-color: #070a13; color: #f8fafc; display: flex; justify-content: center; min-height: 100vh; padding: 16px; }
  .card-container { width: 100%; max-width: 440px; background: #0f172a; border-radius: 28px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
  .hero-img { width: 100%; height: 240px; object-fit: cover; background: #1e293b; }
  .header-bar { padding: 18px 20px; text-align: center; }
  .title { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
  .subtitle { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .content { padding: 20px; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
  .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
  .badge-blue { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #0284c7; }
  .badge-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid #22c55e; }
  .badge-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid #a855f7; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .info-box { background: #111827; border: 1px solid #1e293b; padding: 10px 6px; border-radius: 12px; text-align: center; }
  .info-box span { display: block; font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
  .info-box strong { font-size: 13px; color: #ffffff; }
  .box-note { background: #111827; border-left: 4px solid #ea580c; padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; line-height: 1.4; color: #cbd5e1; }
  .cta-group { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: 700; text-decoration: none; transition: 0.2s; border: none; cursor: pointer; }
  .btn-orange { background: #ea580c; color: #fff; }
  .btn-green { background: #22c55e; color: #fff; }
  .btn-blue { background: #0284c7; color: #fff; }
  .btn-dark { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
  .footer { text-align: center; padding: 14px; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  input, textarea, select { width: 100%; padding: 12px; background: #111827; border: 1px solid #334155; border-radius: 10px; color: #fff; margin-top: 6px; margin-bottom: 14px; font-size: 14px; }
  label { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
`;

// =========================================================================
// 1. DİNAMİK MOBİL PROFİL GÖRÜNTÜLEYİCİ (/t/:tagId)
// =========================================================================
app.get('/t/:tagId', async (req, res) => {
  const tagId = req.params.tagId;
  try {
    const tagRes = await db.execute({ sql: 'SELECT * FROM tags WHERE id = ?', args: [tagId] });
    const tag = tagRes.rows[0];
    if (!tag) return res.status(404).send('<h2>Smart Tag Bulunamadi</h2>');

    // 1. PATİ
    if (tag.type === 'pet') {
      const pRes = await db.execute({ sql: 'SELECT * FROM pet_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag - ${p.name}</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container">
          ${p.photo_url ? `<img src="${p.photo_url}" class="hero-img">` : ''}
          <div class="header-bar" style="background: linear-gradient(135deg, #ea580c, #f97316);">
            <div class="title">${p.name}</div>
            <div class="subtitle">Cip No: ${p.chip_no || '-'}</div>
          </div>
          <div class="content">
            <span class="badge badge-red">🚨 Kayip Durumunda Ulasin</span>
            <div class="info-grid">
              <div class="info-box"><span>Irk</span><strong>${p.breed || '-'}</strong></div>
              <div class="info-box"><span>Yas</span><strong>${p.age || '-'}</strong></div>
              <div class="info-box"><span>Cinsiyet</span><strong>${p.gender || '-'}</strong></div>
            </div>
            <div class="box-note" style="border-color:#ef4444;"><strong style="color:#f87171;">Saglik & Davranis Notu:</strong><br>${p.health_note || 'Belirtilmedi'}</div>
            <div class="box-note" style="border-color:#64748b;"><strong style="color:#94a3b8;">Kayitli Semt / Bolge:</strong><br>${p.address || 'Belirtilmedi'}</div>
            <div class="cta-group">
              <a href="tel:${p.phone}" class="btn btn-orange">📞 Sahibini Dogrudan Ara</a>
              <a href="https://wa.me/${p.whatsapp}?text=Merhaba,%20${encodeURIComponent(p.name)}%20isimli%20dostunuzu%20buldum." class="btn btn-green">💬 WhatsApp'tan Konum Gonder</a>
              <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Bilgileri Guncelle (Sahip Girisi)</a>
            </div>
          </div>
          <div class="footer">Smart Tag Akilli Pati Guvenlik Sistemi &bull; smarttag.com</div>
        </div></body></html>
      `);
    }

    // 2. ARAÇ PARK
    if (tag.type === 'car_park') {
      const pRes = await db.execute({ sql: 'SELECT * FROM car_park_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag - Park QR</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="text-align:center;">
          <div class="header-bar" style="background: linear-gradient(135deg, #0284c7, #38bdf8);">
            <div class="title" style="color:#0f172a;">ARAC PARK ILETISIMI</div>
            <div class="subtitle" style="color:#0f172a; font-weight:600;">Surucuye Ulasin</div>
          </div>
          <div class="content">
            <div style="background:#fff; color:#000; font-weight:900; font-size:22px; padding:10px 24px; border-radius:8px; display:inline-block; border:2px solid #000; letter-spacing:2px; margin-bottom:14px;">${p.plate}</div>
            <div class="box-note" style="border-color:#38bdf8; text-align:left;"><strong style="color:#38bdf8;">Surucu Notu:</strong><br>${p.status_message}</div>
            <span class="badge badge-blue">🔒 Guvenli Surucu Iletisimi</span>
            <div class="cta-group">
              <a href="tel:${p.phone}" class="btn btn-blue">📞 Surucuyu Ara</a>
              <a href="https://wa.me/${p.whatsapp}?text=Merhaba,%20${encodeURIComponent(p.plate)}%20plakali%20aracinizla%20ilgili%20ulasmaktayim." class="btn btn-green">💬 WhatsApp Mesaji Gonder</a>
              <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Park Durumunu Guncelle</a>
            </div>
          </div>
          <div class="footer">Smart Tag Arac Park Cozumleri &bull; smarttag.com</div>
        </div></body></html>
      `);
    }

    // 3. ARAÇ BAKIM & SERVİS
    if (tag.type === 'service') {
      const pRes = await db.execute({ sql: 'SELECT * FROM vehicle_service_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag - Bakim Takibi</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container">
          <div class="header-bar" style="background: linear-gradient(135deg, #10b981, #059669);">
            <div class="title">${p.plate}</div>
            <div class="subtitle">${p.vehicle_model || 'Arac Servis Takip Karti'}</div>
          </div>
          <div class="content">
            <span class="badge badge-green">🔧 Periyodik Bakim Takip Karti</span>
            <div class="info-grid" style="grid-template-columns:1fr 1fr;">
              <div class="info-box"><span>Son Bakim Km</span><strong>${p.last_service_km || '-'} KM</strong></div>
              <div class="info-box"><span>Gelecek Bakim Km</span><strong>${p.next_service_km || '-'} KM</strong></div>
            </div>
            <div class="box-note" style="border-color:#10b981;"><strong style="color:#34d399;">Son Bakim Tarihi:</strong> ${p.last_service_date || '-'}<br><br><strong style="color:#34d399;">Yapilan Islemler:</strong><br>${p.notes || 'Kayit yok.'}</div>
            <div class="cta-group">
              ${p.phone ? `<a href="tel:${p.phone}" class="btn btn-green">📞 Servisi / Sahibini Ara</a>` : ''}
              <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Bakim Kaydini Guncelle</a>
            </div>
          </div>
          <div class="footer">Smart Tag Dijital Servis Karti &bull; smarttag.com</div>
        </div></body></html>
      `);
    }

    // 4. VALİZ / SEYAHAT
    if (tag.type === 'luggage') {
      const pRes = await db.execute({ sql: 'SELECT * FROM luggage_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag - Valiz Guvenligi</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container">
          <div class="header-bar" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
            <div class="title">${p.owner_name}</div>
            <div class="subtitle">Ucus / Bagaj No: ${p.flight_no || '-'}</div>
          </div>
          <div class="content">
            <span class="badge badge-purple">✈️ Akilli Bagaj Guvenlik Etiketi</span>
            <div class="box-note" style="border-color:#6366f1;"><strong style="color:#818cf8;">Seyahat / Otel Adresi:</strong><br>${p.hotel_address || 'Belirtilmedi'}</div>
            <div class="box-note" style="border-color:#22c55e;"><strong style="color:#4ade80;">Odul / Teslim Notu:</strong><br>${p.reward_note || 'Valizimi teslim eden kisiye tesekkur hediyesi verilecektir.'}</div>
            <div class="cta-group">
              <a href="tel:${p.phone}" class="btn btn-blue">📞 Valiz Sahibini Ara</a>
              <a href="https://wa.me/${p.whatsapp}?text=Merhaba,%20${encodeURIComponent(p.owner_name)}%20adli%20valizinizi%20buldum." class="btn btn-green">💬 WhatsApp'tan Konum Paylas</a>
              <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Seyahat Adresini Guncelle</a>
            </div>
          </div>
          <div class="footer">Smart Tag Seyahat Etiketi &bull; smarttag.com</div>
        </div></body></html>
      `);
    }

    // 5. DİJİTAL KARTVİZİT / SOSYAL MEDYA
    if (tag.type === 'bio') {
      const pRes = await db.execute({ sql: 'SELECT * FROM bio_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${p.full_name} — Smart Bio</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="text-align:center;">
          ${p.photo_url ? `<img src="${p.photo_url}" style="width:100px; height:100px; border-radius:50%; border:3px solid #ea580c; margin-top:24px; object-fit:cover;">` : '<div style="font-size:40px; margin-top:20px;">👤</div>'}
          <div style="font-size:22px; font-weight:800; margin-top:10px;">${p.full_name}</div>
          <div style="color:#ea580c; font-size:13px; font-weight:700; margin-bottom:12px;">${p.title || ''}</div>
          <p style="font-size:13px; color:#94a3b8; padding:0 24px; margin-bottom:20px;">${p.bio_note || ''}</p>
          <div class="content" style="padding-top:0;">
            <div class="cta-group">
              ${p.phone ? `<a href="tel:${p.phone}" class="btn btn-orange">📞 Telefon Rehberine Ekle / Ara</a>` : ''}
              ${p.instagram ? `<a href="https://instagram.com/${p.instagram.replace('@','')}" target="_blank" class="btn btn-dark" style="border-color:#e1306c;">📸 Instagram: @${p.instagram.replace('@','')}</a>` : ''}
              ${p.linkedin ? `<a href="${p.linkedin}" target="_blank" class="btn btn-dark" style="border-color:#0077b5;">💼 LinkedIn Profili</a>` : ''}
              ${p.youtube ? `<a href="${p.youtube}" target="_blank" class="btn btn-dark" style="border-color:#ff0000;">▶️ YouTube Kanali</a>` : ''}
              ${p.website ? `<a href="${p.website}" target="_blank" class="btn btn-blue">🌐 Resmi Web Sitesi</a>` : ''}
              <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Kartviziti Guncelle</a>
            </div>
          </div>
          <div class="footer">Smart Tag Dijital Kartvizit &bull; smarttag.com</div>
        </div></body></html>
      `);
    }

  } catch (e) {
    res.status(500).send('Hata olustu: ' + e.message);
  }
});

// =========================================================================
// 2. MÜŞTERİ PIN DOĞRULAMALI GÜNCELLEME EKRANI (/edit/:tagId)
// =========================================================================
app.get('/edit/:tagId', async (req, res) => {
  const tagId = req.params.tagId;
  const pin = req.query.pin;

  try {
    const tagRes = await db.execute({ sql: 'SELECT * FROM tags WHERE id = ?', args: [tagId] });
    const tag = tagRes.rows[0];
    if (!tag) return res.send('Etiket bulunamadi.');

    if (!pin || pin !== tag.edit_pin) {
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — Guvenli Giris</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#ea580c; margin-bottom:10px;">🔒 Musteri Duzenleme Paneli</h2>
          <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">Bilgilerinizi guncellemek icin teslim belgenizde yazan 4 haneli PIN kodunu giriniz.</p>
          ${pin ? '<p style="color:#ef4444; font-size:13px; font-weight:bold; margin-bottom:10px;">Hatali PIN kodu girdiniz!</p>' : ''}
          <form method="GET" action="/edit/${tagId}">
            <label>4 Haneli PIN Kodu:</label>
            <input type="password" name="pin" maxlength="4" placeholder="Orn: 1234" required autofocus style="text-align:center; font-size:22px; letter-spacing:4px;">
            <button type="submit" class="btn btn-orange" style="width:100%;">Giris Yap</button>
          </form>
        </div></body></html>
      `);
    }

    // Pati Formu
    if (tag.type === 'pet') {
      const pRes = await db.execute({ sql: 'SELECT * FROM pet_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — ${p.name} Guncelle</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#ea580c; margin-bottom:6px;">🐾 Bilgileri Guncelle</h2>
          <form method="POST" action="/api/update/${tagId}">
            <input type="hidden" name="pin" value="${tag.edit_pin}">
            <label>Pati Ismi:</label><input type="text" name="name" value="${p.name}" required>
            <label>Mikrocip Numarasi (Cip No):</label><input type="text" name="chip_no" value="${p.chip_no || ''}">
            <label>Iletisim Telefon Numarasi (Arama):</label><input type="text" name="phone" value="${p.phone}" required>
            <label>WhatsApp Numarasi:</label><input type="text" name="whatsapp" value="${p.whatsapp}" required>
            <label>Kayitli Semt / Sehir / Adres:</label><input type="text" name="address" value="${p.address || ''}">
            <label>Saglik & Davranis Notu:</label><textarea name="health_note" rows="3">${p.health_note || ''}</textarea>
            <label>Fotograf Linki (URL):</label><input type="text" name="photo_url" value="${p.photo_url || ''}">
            <button type="submit" class="btn btn-orange" style="width:100%;">💾 Kaydet & Canliya Al</button>
          </form>
        </div></body></html>
      `);
    }

    // Araç Park Formu
    if (tag.type === 'car_park') {
      const pRes = await db.execute({ sql: 'SELECT * FROM car_park_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — Park QR Guncelle</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#0284c7; margin-bottom:6px;">🚗 Park Durumunu Guncelle</h2>
          <form method="POST" action="/api/update/${tagId}">
            <input type="hidden" name="pin" value="${tag.edit_pin}">
            <label>Plaka:</label><input type="text" name="plate" value="${p.plate}" required>
            <label>Anlik Park / Durum Notu:</label><textarea name="status_message" rows="3">${p.status_message}</textarea>
            <label>Iletisim Numarasi (Arama):</label><input type="text" name="phone" value="${p.phone}" required>
            <label>WhatsApp Numarasi:</label><input type="text" name="whatsapp" value="${p.whatsapp}" required>
            <button type="submit" class="btn btn-blue" style="width:100%;">💾 Durumu Guncelle</button>
          </form>
        </div></body></html>
      `);
    }

    // Araç Servis Formu
    if (tag.type === 'service') {
      const pRes = await db.execute({ sql: 'SELECT * FROM vehicle_service_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — Servis Kaydi Guncelle</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#10b981; margin-bottom:6px;">🔧 Bakim Bilgilerini Guncelle</h2>
          <form method="POST" action="/api/update/${tagId}">
            <input type="hidden" name="pin" value="${tag.edit_pin}">
            <label>Son Bakim Kilometresi:</label><input type="text" name="last_service_km" value="${p.last_service_km || ''}">
            <label>Gelecek Bakim Kilometresi:</label><input type="text" name="next_service_km" value="${p.next_service_km || ''}">
            <label>Son Bakim Tarihi:</label><input type="text" name="last_service_date" value="${p.last_service_date || ''}">
            <label>Yapilan Islemler & Parca Degisimleri:</label><textarea name="notes" rows="3">${p.notes || ''}</textarea>
            <button type="submit" class="btn btn-green" style="width:100%;">💾 Bakim Kaydini Kaydet</button>
          </form>
        </div></body></html>
      `);
    }

    // Valiz Formu
    if (tag.type === 'luggage') {
      const pRes = await db.execute({ sql: 'SELECT * FROM luggage_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — Valiz Guncelle</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#6366f1; margin-bottom:6px;">✈️ Seyahat Bilgilerini Guncelle</h2>
          <form method="POST" action="/api/update/${tagId}">
            <input type="hidden" name="pin" value="${tag.edit_pin}">
            <label>Ucus / Otobus / Koltuk No:</label><input type="text" name="flight_no" value="${p.flight_no || ''}">
            <label>Guncel Otel / Konaklama Adresi:</label><textarea name="hotel_address" rows="3">${p.hotel_address || ''}</textarea>
            <label>Iletisim Numarasi (Arama):</label><input type="text" name="phone" value="${p.phone}" required>
            <button type="submit" class="btn btn-blue" style="width:100%;">💾 Seyahati Guncelle</button>
          </form>
        </div></body></html>
      `);
    }

    // Kartvizit Formu
    if (tag.type === 'bio') {
      const pRes = await db.execute({ sql: 'SELECT * FROM bio_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — Kartvizit Guncelle</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#ea580c; margin-bottom:6px;">💼 Kartvizitini Guncelle</h2>
          <form method="POST" action="/api/update/${tagId}">
            <input type="hidden" name="pin" value="${tag.edit_pin}">
            <label>Ad Soyad:</label><input type="text" name="full_name" value="${p.full_name}" required>
            <label>Unvan / Meslek:</label><input type="text" name="title" value="${p.title || ''}">
            <label>Kisa Biyografi:</label><textarea name="bio_note" rows="2">${p.bio_note || ''}</textarea>
            <label>Instagram Kullanici Adi:</label><input type="text" name="instagram" value="${p.instagram || ''}">
            <label>LinkedIn Profil URL:</label><input type="text" name="linkedin" value="${p.linkedin || ''}">
            <label>Web Sitesi URL:</label><input type="text" name="website" value="${p.website || ''}">
            <label>Telefon Numarasi:</label><input type="text" name="phone" value="${p.phone || ''}">
            <button type="submit" class="btn btn-orange" style="width:100%;">💾 Kartviziti Kaydet</button>
          </form>
        </div></body></html>
      `);
    }

  } catch (e) {
    res.status(500).send('Hata: ' + e.message);
  }
});

app.post('/api/update/:tagId', async (req, res) => {
  const tagId = req.params.tagId;
  const pin = req.body.pin;

  try {
    const tagRes = await db.execute({ sql: 'SELECT * FROM tags WHERE id = ?', args: [tagId] });
    const tag = tagRes.rows[0];
    if (!tag || tag.edit_pin !== pin) return res.status(403).send('Yetkisiz islem.');

    if (tag.type === 'pet') {
      const { name, chip_no, phone, whatsapp, address, health_note, photo_url } = req.body;
      await db.execute({
        sql: `UPDATE pet_profiles SET name = ?, chip_no = ?, phone = ?, whatsapp = ?, address = ?, health_note = ?, photo_url = ? WHERE tag_id = ?`,
        args: [name, chip_no, phone, whatsapp, address, health_note, photo_url, tagId]
      });
    } else if (tag.type === 'car_park') {
      const { plate, status_message, phone, whatsapp } = req.body;
      await db.execute({
        sql: `UPDATE car_park_profiles SET plate = ?, status_message = ?, phone = ?, whatsapp = ? WHERE tag_id = ?`,
        args: [plate, status_message, phone, whatsapp, tagId]
      });
    } else if (tag.type === 'service') {
      const { last_service_km, next_service_km, last_service_date, notes } = req.body;
      await db.execute({
        sql: `UPDATE vehicle_service_profiles SET last_service_km = ?, next_service_km = ?, last_service_date = ?, notes = ? WHERE tag_id = ?`,
        args: [last_service_km, next_service_km, last_service_date, notes, tagId]
      });
    } else if (tag.type === 'luggage') {
      const { flight_no, hotel_address, phone } = req.body;
      await db.execute({
        sql: `UPDATE luggage_profiles SET flight_no = ?, hotel_address = ?, phone = ? WHERE tag_id = ?`,
        args: [flight_no, hotel_address, phone, tagId]
      });
    } else if (tag.type === 'bio') {
      const { full_name, title, bio_note, instagram, linkedin, website, phone } = req.body;
      await db.execute({
        sql: `UPDATE bio_profiles SET full_name = ?, title = ?, bio_note = ?, instagram = ?, linkedin = ?, website = ?, phone = ? WHERE tag_id = ?`,
        args: [full_name, title, bio_note, instagram, linkedin, website, phone, tagId]
      });
    }

    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Guncellendi</title><style>${getCommonCSS()}</style></head>
      <body><div class="card-container" style="padding:30px; text-align:center;">
        <h2 style="color:#22c55e; margin-bottom:12px;">✅ Bilgileriniz Guncellendi!</h2>
        <p style="color:#cbd5e1; font-size:14px; margin-bottom:20px;">QR kodunuz degismeden yeni bilgileriniz aninda profilinizde aktif edilmistir.</p>
        <a href="/t/${tagId}" class="btn btn-orange">Canli Profili Goruntule</a>
      </div></body></html>
    `);
  } catch (e) {
    res.status(500).send('Hata: ' + e.message);
  }
});

// =========================================================================
// 3. EVRENSEL BASKIYA HAZIR A4 PDF ÜRETİM MOTORU (/api/pdf/:tagId)
// =========================================================================
app.get('/api/pdf/:tagId', async (req, res) => {
  const tagId = req.params.tagId;
  const protocol = req.protocol;
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}/t/${tagId}`;

  try {
    const tagRes = await db.execute({ sql: 'SELECT * FROM tags WHERE id = ?', args: [tagId] });
    const tag = tagRes.rows[0];
    if (!tag) return res.status(404).send('Etiket bulunamadi.');

    const qrBuffer = await QRCode.toBuffer(fullUrl, { width: 300, margin: 1 });
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="smart_tag_${tag.type}_${tagId}.pdf"`);
    doc.pipe(res);

    // Üst Şerit
    doc.rect(0, 0, 595, 60).fill('#0b0f19');
    doc.rect(0, 60, 595, 4).fill('#ea580c');
    doc.fillColor('#ea580c').fontSize(16).text('SMART TAG', 40, 20);
    doc.fillColor('#ffffff').fontSize(12).text(`DIJITAL ${tag.type.toUpperCase()} BASKI VE TESLIMAT SABLONU`, 40, 38);
    doc.fillColor('#94a3b8').fontSize(10).text(`SERI: ${tagId.toUpperCase()} | PIN: ${tag.edit_pin}`, 350, 25, { align: 'right', width: 200 });

    // 1. PATİ PDF
    if (tag.type === 'pet') {
      const pRes = await db.execute({ sql: 'SELECT * FROM pet_profiles WHERE tag_id = ?', args: [tagId] });
      const p = pRes.rows[0];

      doc.fillColor('#0b0f19').fontSize(12).text('1. CUZDAN KIMLIK KARTI (Kesip Cuzdaninizda Tasiyiniz)', 40, 85);
      doc.roundedRect(40, 105, 300, 160, 10).fillAndStroke('#0f172a', '#334155');
      doc.rect(40, 105, 300, 25).fill('#ea580c');
      doc.fillColor('#ffffff').fontSize(10).text(`AKILLI PATI KIMLIGI - ${trToEn(p.name)}`, 50, 112);
      doc.text('SMART TAG', 270, 112);

      doc.fillColor('#ffffff').fontSize(9).text(`Isim: ${trToEn(p.name)}`, 50, 140);
      doc.fillColor('#cbd5e1').fontSize(8).text(`Irk: ${trToEn(p.breed)}`, 50, 155);
      doc.text(`Yas: ${trToEn(p.age)} | Cinsiyet: ${trToEn(p.gender)}`, 50, 170);
      doc.text(`Cip No: ${p.chip_no || '-'}`, 50, 185);
      doc.fillColor('#f87171').text(`Not: ${trToEn(p.health_note).substring(0, 30)}...`, 50, 200);

      doc.image(qrBuffer, 250, 138, { width: 75 });
      doc.roundedRect(50, 230, 280, 20, 4).fill('#1e293b');
      doc.fillColor('#38bdf8').fontSize(7.5).text(`ACIL DURUMDA OKUTUNUZ / SAHIBI: ${p.phone}`, 55, 236, { align: 'center', width: 270 });

      doc.fillColor('#0b0f19').fontSize(12).text('2. TASMA KUNYE ETIKETLERI', 360, 85);
      doc.circle(425, 180, 50).fillAndStroke('#0f172a', '#ea580c');
      doc.image(qrBuffer, 400, 155, { width: 50 });
      doc.fillColor('#ffffff').fontSize(8).text(trToEn(p.name), 400, 140, { width: 50, align: 'center' });
      doc.fillColor('#38bdf8').fontSize(7).text('BENI ARA', 400, 212, { width: 50, align: 'center' });

      doc.circle(520, 180, 42).fillAndStroke('#ea580c', '#0f172a');
      doc.image(qrBuffer, 500, 160, { width: 40 });
      doc.fillColor('#ffffff').fontSize(8).text(trToEn(p.name), 500, 206, { width: 40, align: 'center' });
    } 
    // 2. DİĞER MODÜLLER İÇİN EVRENSEL PROFESYONEL STANDART KART PDF'İ
    else {
      doc.fillColor('#0b0f19').fontSize(12).text('1. DİJİTAL ETİKET & STANDART KART ŞABLONU', 40, 85);
      doc.roundedRect(40, 105, 320, 160, 10).fillAndStroke('#0f172a', '#334155');
      doc.rect(40, 105, 320, 25).fill('#0284c7');
      doc.fillColor('#ffffff').fontSize(10).text(`SMART TAG - ${tag.type.toUpperCase()}`, 50, 112);

      doc.image(qrBuffer, 55, 140, { width: 90 });
      doc.fillColor('#ffffff').fontSize(11).text(trToEn(tag.title), 160, 145);
      doc.fillColor('#94a3b8').fontSize(8.5).text('Telefon kamerasi ile okutarak dogrudan iletisime gecebilir veya kayitlari inceleyebilirsiniz.', 160, 170, { width: 190 });

      doc.fillColor('#0b0f19').fontSize(12).text('2. MINI VURGU / YAPIŞTIRMA ETİKETLERİ', 380, 85);
      doc.roundedRect(380, 105, 175, 160, 10).fillAndStroke('#0f172a', '#ea580c');
      doc.image(qrBuffer, 425, 125, { width: 85 });
      doc.fillColor('#ea580c').fontSize(9).text('KAMERAYA OKUTUN', 380, 225, { width: 175, align: 'center' });
    }

    // Alt Kılavuz & Test QR
    doc.rect(40, 290, 515, 1).fill('#e2e8f0');
    doc.fillColor('#0b0f19').fontSize(12).text('3. BUYUK BOY TEST QR KODU & DUZENLEME KILAVUZU', 40, 310);

    doc.roundedRect(40, 335, 180, 180, 10).fillAndStroke('#0f172a', '#ea580c');
    doc.image(qrBuffer, 50, 345, { width: 160 });

    doc.roundedRect(235, 335, 320, 180, 10).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0b0f19').fontSize(10).text('NASIL CALISIR?', 250, 350);
    doc.fillColor('#334155').fontSize(8.5).text('• QR kod telefon kamerasiyla okutuldugunda ozel dijital profil acilir.\n• Herhangi bir mobil uygulama kurulumu gerekmez.', 250, 368, { width: 290 });

    doc.fillColor('#ea580c').fontSize(10).text('BILGILERI NASIL GUNCELLEYEBILIRSINIZ?', 250, 415);
    doc.fillColor('#334155').fontSize(8.5).text(`• Numaraniz veya durumunuz degistiginde asagidaki baglantidan guncelleyin:\n  Link: ${fullUrl.replace('/t/', '/edit/')}\n  PIN Kodunuz: ${tag.edit_pin}`, 250, 433, { width: 290 });

    doc.rect(40, 750, 515, 40).fill('#0b0f19');
    doc.fillColor('#ffffff').fontSize(9).text('SMART TAG AKILLI DIJITAL GUVENLIK SISTEMLERI', 50, 765);
    doc.fillColor('#ea580c').text('300 DPI BASKI SABLONU', 400, 765, { align: 'right', width: 145 });

    doc.end();
  } catch (e) {
    res.status(500).send('Hata: ' + e.message);
  }
});

// =========================================================================
// 4. MERKEZİ DİNAMİK YÖNETİCİ PANELİ (/admin)
// =========================================================================
app.get('/admin', async (req, res) => {
  try {
    const tagsRes = await db.execute('SELECT * FROM tags ORDER BY created_at DESC');
    const tags = tagsRes.rows;

    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Smart Tag — Yonetici Paneli</title><style>${getCommonCSS()}</style>
      <script>
        function toggleCategoryFields() {
          const cat = document.getElementById('project_type').value;
          document.querySelectorAll('.cat-group').forEach(el => el.style.display = 'none');
          document.getElementById('group_' + cat).style.display = 'block';
        }
      </script>
      </head>
      <body style="display:block; max-width:900px; margin:0 auto;">
        <h1 style="color:#ea580c; margin-bottom:6px;">🏷️ Smart Tag Merkezi Yonetim Paneli</h1>
        <p style="color:#94a3b8; font-size:14px; margin-bottom:20px;">Tum urun gruplari (Pati, Arac Park, Servis Bakim, Valiz, Sosyal Medya) icin siparis olusturun ve A4 PDF indirin.</p>

        <div style="background:#0f172a; border:1px dashed #ea580c; border-radius:18px; padding:20px; margin-bottom:30px;">
          <h3 style="color:#fff; margin-bottom:14px;">➕ Yeni Siparis / Urun Tanımla</h3>
          <form method="POST" action="/admin/create">
            
            <label>1. Proje / Urun Kategorisi Secin:</label>
            <select id="project_type" name="project_type" onchange="toggleCategoryFields()" style="background:#1e293b; color:#ea580c; font-weight:bold; font-size:15px;">
              <option value="pet">🐾 Akilli Pati Kimligi</option>
              <option value="car_park">🚗 Arac Park QR & Surucu Iletisimi</option>
              <option value="service">🔧 Arac Servis & Periyodik Bakim Karti</option>
              <option value="luggage">✈️ Valiz & Seyahat Guvenlik Etiketi</option>
              <option value="bio">💼 Dijital Kartvizit & Sosyal Medya Profili</option>
            </select>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label>Ozel Kod (Slug / URL):</label>
                <input type="text" name="tag_id" placeholder="Orn: tag-9810" required>
              </div>
              <div>
                <label>Musteri PIN Kodu (4 Hane):</label>
                <input type="text" name="edit_pin" placeholder="Orn: 1234" maxlength="4" required>
              </div>
            </div>

            <!-- PATİ ALANLARI -->
            <div id="group_pet" class="cat-group">
              <label>Pati Ismi:</label><input type="text" name="pet_name" placeholder="Orn: Tarcin">
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                <div><label>Irk:</label><input type="text" name="pet_breed" placeholder="Golden"></div>
                <div><label>Yas:</label><input type="text" name="pet_age" placeholder="2 Yas"></div>
                <div><label>Cinsiyet:</label><input type="text" name="pet_gender" placeholder="Disi"></div>
              </div>
              <label>Mikrocip Numarasi (Cip No):</label><input type="text" name="pet_chip_no" placeholder="981098102938472">
              <label>Iletisim Telefonu (Arama):</label><input type="text" name="pet_phone" placeholder="+905xxxxxxxxx">
              <label>WhatsApp Numarasi:</label><input type="text" name="pet_whatsapp" placeholder="905xxxxxxxxx">
              <label>Kayitli Semt / Sehir:</label><input type="text" name="pet_address" placeholder="Uskudar / Istanbul">
              <label>Saglik & Davranis Notu:</label><textarea name="pet_health_note" rows="2" placeholder="Alerjisi vardir, uysaldir."></textarea>
              <label>Fotograf URL (Opsiyonel):</label><input type="text" name="pet_photo_url" placeholder="https://...">
            </div>

            <!-- ARAÇ PARK ALANLARI -->
            <div id="group_car_park" class="cat-group" style="display:none;">
              <label>Arac Plakasi:</label><input type="text" name="car_plate" placeholder="34 ABC 789">
              <label>Anlik Park Notu:</label><input type="text" name="car_status" placeholder="10 dakika sonra gelecegim. Acilse arayabilirsiniz.">
              <label>Iletisim Telefonu:</label><input type="text" name="car_phone" placeholder="+905xxxxxxxxx">
              <label>WhatsApp Numarasi:</label><input type="text" name="car_whatsapp" placeholder="905xxxxxxxxx">
            </div>

            <!-- SERVİS BAKIM ALANLARI -->
            <div id="group_service" class="cat-group" style="display:none;">
              <label>Plaka & Arac Modeli:</label><input type="text" name="srv_plate" placeholder="34 ABC 789 - VW Golf 2020">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div><label>Son Bakim Km:</label><input type="text" name="srv_last_km" placeholder="90.000 KM"></div>
                <div><label>Gelecek Bakim Km:</label><input type="text" name="srv_next_km" placeholder="105.000 KM"></div>
              </div>
              <label>Son Bakim Tarihi:</label><input type="text" name="srv_date" placeholder="26.08.2026">
              <label>Yapilan Islemler / Notlar:</label><textarea name="srv_notes" rows="2" placeholder="Yag, hava/polen filtresi ve bujiler degisti."></textarea>
              <label>Iletisim / Servis No:</label><input type="text" name="srv_phone" placeholder="+905xxxxxxxxx">
            </div>

            <!-- VALİZ ALANLARI -->
            <div id="group_luggage" class="cat-group" style="display:none;">
              <label>Valiz Sahibi Ad Soyad:</label><input type="text" name="lug_name" placeholder="Emir Arslan">
              <label>Ucus / Otobus / Koltuk No:</label><input type="text" name="lug_flight" placeholder="TK1984 - Koltuk 14A">
              <label>Otel / Konaklama Adresi:</label><input type="text" name="lug_hotel" placeholder="Hilton Hotel, Oda 402 - Roma / Italya">
              <label>Iletisim Numarasi (Arama):</label><input type="text" name="lug_phone" placeholder="+905xxxxxxxxx">
              <label>WhatsApp Numarasi:</label><input type="text" name="lug_whatsapp" placeholder="905xxxxxxxxx">
              <label>Odul / Teslim Notu:</label><input type="text" name="lug_reward" placeholder="Valizimi getirene nakit tesekkur hediyesi verilecektir.">
            </div>

            <!-- SOSYAL MEDYA / KARTVİZİT -->
            <div id="group_bio" class="cat-group" style="display:none;">
              <label>Ad Soyad:</label><input type="text" name="bio_name" placeholder="Emir Arslan">
              <label>Unvan / Meslek:</label><input type="text" name="bio_title" placeholder="Yazilim Muhendisi & Girisimci">
              <label>Kisa Biyografi:</label><textarea name="bio_note" rows="2" placeholder="Projelerim ve iletisim kanallarim asagidadir."></textarea>
              <label>Instagram Kullanici Adi:</label><input type="text" name="bio_instagram" placeholder="@kullaniciadi">
              <label>LinkedIn Profil URL:</label><input type="text" name="bio_linkedin" placeholder="https://linkedin.com/in/...">
              <label>Web Sitesi URL:</label><input type="text" name="bio_website" placeholder="https://emirarslan.com">
              <label>Telefon Numarasi:</label><input type="text" name="bio_phone" placeholder="+905xxxxxxxxx">
              <label>Profil Fotograf Linki (URL):</label><input type="text" name="bio_photo" placeholder="https://...">
            </div>

            <button type="submit" class="btn btn-orange" style="width:100%; margin-top:10px;">🚀 Etiketi Olustur & Canliya Al</button>
          </form>
        </div>

        <h3 style="color:#fff; margin-bottom:14px;">📋 Kayitli Akilli Etiketler</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          ${tags.map(t => `
            <div style="background:#0f172a; border:1px solid #1e293b; border-radius:16px; padding:18px;">
              <span class="badge badge-red">${t.type.toUpperCase()}</span>
              <h3 style="font-size:16px; margin-bottom:4px;">${t.title}</h3>
              <p style="font-size:12px; color:#94a3b8;">Kod: <code>/t/${t.id}</code> | PIN: <code>${t.edit_pin}</code></p>
              <div style="display:flex; gap:8px; margin-top:14px;">
                <a href="/t/${t.id}" target="_blank" class="btn btn-dark" style="flex:1; font-size:12px; padding:10px;">Goruntule</a>
                <a href="/api/pdf/${t.id}" target="_blank" class="btn btn-green" style="flex:1; font-size:12px; padding:10px;">📄 PDF Indir</a>
              </div>
            </div>
          `).join('')}
        </div>
      </body></html>
    `);
  } catch (e) {
    res.status(500).send('Hata: ' + e.message);
  }
});

// Admin Kayıt Oluşturma API'si
app.post('/admin/create', async (req, res) => {
  const { project_type, tag_id, edit_pin } = req.body;
  const cleanId = tag_id.trim().toLowerCase();

  try {
    if (project_type === 'pet') {
      const { pet_name, pet_breed, pet_age, pet_gender, pet_chip_no, pet_phone, pet_whatsapp, pet_address, pet_health_note, pet_photo_url } = req.body;
      await db.execute({
        sql: "INSERT INTO tags (id, type, title, edit_pin) VALUES (?, 'pet', ?, ?)",
        args: [cleanId, `${pet_name} Pati Kimligi`, edit_pin]
      });
      await db.execute({
        sql: `INSERT INTO pet_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [cleanId, pet_name.toUpperCase(), pet_breed, pet_age, pet_gender, pet_chip_no, pet_address, pet_phone, pet_whatsapp, pet_health_note, pet_photo_url]
      });
    } else if (project_type === 'car_park') {
      const { car_plate, car_status, car_phone, car_whatsapp } = req.body;
      await db.execute({
        sql: "INSERT INTO tags (id, type, title, edit_pin) VALUES (?, 'car_park', ?, ?)",
        args: [cleanId, `${car_plate} Arac Park QR`, edit_pin]
      });
      await db.execute({
        sql: `INSERT INTO car_park_profiles VALUES (?, ?, ?, ?, ?, 0)`,
        args: [cleanId, car_plate.toUpperCase(), car_status, car_phone, car_whatsapp]
      });
    } else if (project_type === 'service') {
      const { srv_plate, srv_last_km, srv_next_km, srv_date, srv_notes, srv_phone } = req.body;
      await db.execute({
        sql: "INSERT INTO tags (id, type, title, edit_pin) VALUES (?, 'service', ?, ?)",
        args: [cleanId, `${srv_plate} Servis Karti`, edit_pin]
      });
      await db.execute({
        sql: `INSERT INTO vehicle_service_profiles VALUES (?, ?, '', ?, ?, ?, ?, ?)`,
        args: [cleanId, srv_plate.toUpperCase(), srv_last_km, srv_next_km, srv_date, srv_notes, srv_phone]
      });
    } else if (project_type === 'luggage') {
      const { lug_name, lug_flight, lug_hotel, lug_phone, lug_whatsapp, lug_reward } = req.body;
      await db.execute({
        sql: "INSERT INTO tags (id, type, title, edit_pin) VALUES (?, 'luggage', ?, ?)",
        args: [cleanId, `${lug_name} Valiz Etiketi`, edit_pin]
      });
      await db.execute({
        sql: `INSERT INTO luggage_profiles VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [cleanId, lug_name.toUpperCase(), lug_flight, lug_hotel, lug_phone, lug_whatsapp, lug_reward]
      });
    } else if (project_type === 'bio') {
      const { bio_name, bio_title, bio_note, bio_instagram, bio_linkedin, bio_website, bio_phone, bio_photo } = req.body;
      await db.execute({
        sql: "INSERT INTO tags (id, type, title, edit_pin) VALUES (?, 'bio', ?, ?)",
        args: [cleanId, `${bio_name} Dijital Kartvizit`, edit_pin]
      });
      await db.execute({
        sql: `INSERT INTO bio_profiles VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?)`,
        args: [cleanId, bio_name, bio_title, bio_note, bio_instagram, bio_linkedin, bio_website, bio_phone, bio_photo]
      });
    }

    res.redirect('/admin');
  } catch (e) {
    res.send('Hata olustu: Bu ID zaten kayitli veya eksik alan var. ' + e.message);
  }
});

app.get('/', (req, res) => res.redirect('/admin'));

app.listen(PORT, () => {
  console.log(`Smart Tag Merkezi Sistemi Turso ile canlida: http://localhost:${PORT}`);
});
