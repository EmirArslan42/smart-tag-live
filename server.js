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

const getCommonCSS = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { background-color: #070a13; color: #f8fafc; display: flex; justify-content: center; min-height: 100vh; padding: 16px; }
  .card-container { width: 100%; max-width: 440px; background: #0f172a; border-radius: 28px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
  .hero-img { width: 100%; height: 260px; object-fit: cover; background: #1e293b; }
  .header-bar { padding: 18px 20px; text-align: center; }
  .title { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
  .subtitle { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .content { padding: 20px; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
  .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
  .badge-blue { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #0284c7; }
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
  input, textarea { width: 100%; padding: 12px; background: #111827; border: 1px solid #334155; border-radius: 10px; color: #fff; margin-top: 6px; margin-bottom: 14px; font-size: 14px; }
  label { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
`;

// Dinamik Profil (/t/:tagId)
app.get('/t/:tagId', (req, res) => {
  const tagId = req.params.tagId;

  db.get('SELECT * FROM tags WHERE id = ?', [tagId], (err, tag) => {
    if (err || !tag) {
      return res.status(404).send('<h2>Smart Tag Bulunamadı</h2><p>Bu QR kod henüz aktif edilmemiş veya geçersiz.</p>');
    }

    if (tag.type === 'pet') {
      db.get('SELECT * FROM pet_profiles WHERE tag_id = ?', [tagId], (err, p) => {
        if (!p) return res.send('Profil detayı bulunamadı.');
        res.send(`
          <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Smart Tag - ${p.name}</title><style>${getCommonCSS()}</style></head>
          <body><div class="card-container">
            ${p.photo_url ? `<img src="${p.photo_url}" class="hero-img">` : ''}
            <div class="header-bar" style="background: linear-gradient(135deg, #ea580c, #f97316);">
              <div class="title">${p.name}</div>
              <div class="subtitle">Çip No: ${p.chip_no}</div>
            </div>
            <div class="content">
              <span class="badge badge-red">🚨 Kayıp Durumunda Ulaşın</span>
              <div class="info-grid">
                <div class="info-box"><span>Irk</span><strong>${p.breed}</strong></div>
                <div class="info-box"><span>Yaş</span><strong>${p.age}</strong></div>
                <div class="info-box"><span>Cinsiyet</span><strong>${p.gender}</strong></div>
              </div>
              <div class="box-note" style="border-color:#ef4444;">
                <strong style="color:#f87171;">Sağlık / Davranış Notu:</strong><br>${p.health_note}
              </div>
              <div class="box-note" style="border-color:#64748b;">
                <strong style="color:#94a3b8;">Kayıtlı Bölge / Adres:</strong><br>${p.address}
              </div>
              <div class="cta-group">
                <a href="tel:${p.phone}" class="btn btn-orange">📞 Sahibini Doğrudan Ara</a>
                <a href="https://wa.me/${p.whatsapp}?text=Merhaba,%20${encodeURIComponent(p.name)}%20isimli%20dostunuzu%20buldum." class="btn btn-green">💬 WhatsApp'tan Konum Gönder</a>
                <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Bilgileri Güncelle (Sahip Girişi)</a>
              </div>
            </div>
            <div class="footer">Smart Tag Akıllı Pati Güvenlik Sistemi &bull; smarttag.com</div>
          </div></body></html>
        `);
      });
    } else if (tag.type === 'car_park') {
      db.get('SELECT * FROM car_park_profiles WHERE tag_id = ?', [tagId], (err, p) => {
        if (!p) return res.send('Profil detayı bulunamadı.');
        res.send(`
          <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Smart Tag - Park QR</title><style>${getCommonCSS()}</style></head>
          <body><div class="card-container" style="text-align:center;">
            <div class="header-bar" style="background: linear-gradient(135deg, #0284c7, #38bdf8);">
              <div class="title" style="color:#0f172a;">ARAÇ PARK İLETİŞİMİ</div>
              <div class="subtitle" style="color:#0f172a; font-weight:600;">Sürücüye Ulaşın</div>
            </div>
            <div class="content">
              <div style="background:#fff; color:#000; font-weight:900; font-size:22px; padding:10px 24px; border-radius:8px; display:inline-block; border:2px solid #000; letter-spacing:2px; margin-bottom:12px;">${p.plate}</div>
              <div class="box-note" style="border-color:#38bdf8; text-align:left;">
                <strong style="color:#38bdf8;">Sürücü Notu:</strong><br>${p.status_message}
              </div>
              <span class="badge badge-blue">🔒 Numara Gizleme ve Güvenli Arama</span>
              <div class="cta-group">
                <a href="tel:${p.phone}" class="btn btn-blue">📞 Sürücüyü Ara</a>
                <a href="https://wa.me/${p.whatsapp}?text=Merhaba,%20${encodeURIComponent(p.plate)}%20plakalı%20aracınızla%20ilgili%20ulaşıyorum." class="btn btn-green">💬 WhatsApp Mesajı Gönder</a>
                <a href="/edit/${tagId}" class="btn btn-dark" style="font-size:12px; margin-top:10px;">⚙️ Park Notunu Güncelle</a>
              </div>
            </div>
            <div class="footer">Smart Tag Araç Park Sistemi &bull; smarttag.com</div>
          </div></body></html>
        `);
      });
    }
  });
});

// Müşteri PIN ile Güncelleme (/edit/:tagId)
app.get('/edit/:tagId', (req, res) => {
  const tagId = req.params.tagId;
  const pin = req.query.pin;

  db.get('SELECT * FROM tags WHERE id = ?', [tagId], (err, tag) => {
    if (!tag) return res.send('Etiket bulunamadı.');

    if (!pin || pin !== tag.edit_pin) {
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Tag — Güvenli Giriş</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:24px;">
          <h2 style="color:#ea580c; margin-bottom:10px;">🔒 Müşteri Düzenleme Paneli</h2>
          <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">Bilgilerinizi güncellemek için teslim belgenizde yazan 4 haneli PIN kodunu giriniz.</p>
          ${pin ? '<p style="color:#ef4444; font-size:13px; font-weight:bold; margin-bottom:10px;">Hatalı PIN kodu girdiniz!</p>' : ''}
          <form method="GET" action="/edit/${tagId}">
            <label>4 Haneli PIN Kodu:</label>
            <input type="password" name="pin" maxlength="4" placeholder="Örn: 1234" required autofocus style="text-align:center; font-size:22px; letter-spacing:4px;">
            <button type="submit" class="btn btn-orange" style="width:100%;">Giriş Yap</button>
          </form>
        </div></body></html>
      `);
    }

    if (tag.type === 'pet') {
      db.get('SELECT * FROM pet_profiles WHERE tag_id = ?', [tagId], (err, p) => {
        res.send(`
          <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Smart Tag — ${p.name} Güncelle</title><style>${getCommonCSS()}</style></head>
          <body><div class="card-container" style="padding:24px;">
            <h2 style="color:#ea580c; margin-bottom:6px;">🐾 Bilgileri Güncelle</h2>
            <p style="font-size:12px; color:#94a3b8; margin-bottom:18px;">Yapılan değişiklikler anında künyenizde canlıya geçer.</p>
            <form method="POST" action="/api/update/${tagId}">
              <input type="hidden" name="pin" value="${tag.edit_pin}">
              <label>Pati İsmi:</label>
              <input type="text" name="name" value="${p.name}" required>
              <label>İletişim Telefon Numarası (Arama İçin):</label>
              <input type="text" name="phone" value="${p.phone}" required>
              <label>WhatsApp Numarası (Başında 90 ile):</label>
              <input type="text" name="whatsapp" value="${p.whatsapp}" required>
              <label>Kayıtlı Semt / Şehir / Adres:</label>
              <input type="text" name="address" value="${p.address}">
              <label>Sağlık & Davranış Notu:</label>
              <textarea name="health_note" rows="3">${p.health_note}</textarea>
              <label>Fotoğraf Linki (URL):</label>
              <input type="text" name="photo_url" value="${p.photo_url || ''}">
              <button type="submit" class="btn btn-orange" style="width:100%; margin-top:10px;">💾 Bilgileri Kaydet & Canlıya Al</button>
            </form>
          </div></body></html>
        `);
      });
    }
  });
});

app.post('/api/update/:tagId', (req, res) => {
  const tagId = req.params.tagId;
  const { pin, name, phone, whatsapp, address, health_note, photo_url } = req.body;

  db.get('SELECT * FROM tags WHERE id = ?', [tagId], (err, tag) => {
    if (!tag || tag.edit_pin !== pin) return res.status(403).send('Yetkisiz işlem.');

    db.run(`
      UPDATE pet_profiles SET name = ?, phone = ?, whatsapp = ?, address = ?, health_note = ?, photo_url = ? WHERE tag_id = ?
    `, [name, phone, whatsapp, address, health_note, photo_url, tagId], (err) => {
      res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Güncellendi</title><style>${getCommonCSS()}</style></head>
        <body><div class="card-container" style="padding:30px; text-align:center;">
          <h2 style="color:#22c55e; margin-bottom:12px;">✅ Bilgileriniz Güncellendi!</h2>
          <p style="color:#cbd5e1; font-size:14px; margin-bottom:20px;">QR kodunuz değişmeden yeni bilgileriniz anında profilinizde aktif edilmiştir.</p>
          <a href="/t/${tagId}" class="btn btn-orange">Canlı Profili Görüntüle</a>
        </div></body></html>
      `);
    });
  });
});

// Dinamik PDF Üretim Motoru (/api/pdf/:tagId)
app.get('/api/pdf/:tagId', async (req, res) => {
  const tagId = req.params.tagId;
  const protocol = req.protocol;
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}/t/${tagId}`;

  db.get('SELECT * FROM tags WHERE id = ?', [tagId], async (err, tag) => {
    if (!tag) return res.status(404).send('Etiket bulunamadı.');

    db.get('SELECT * FROM pet_profiles WHERE tag_id = ?', [tagId], async (err, p) => {
      if (!p) return res.send('Profil yok.');

      const qrBuffer = await QRCode.toBuffer(fullUrl, { width: 300, margin: 1 });

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="smart_tag_${p.name}_teslim.pdf"`);
      doc.pipe(res);

      doc.rect(0, 0, 595, 60).fill('#0b0f19');
      doc.rect(0, 60, 595, 4).fill('#ea580c');
      doc.fillColor('#ea580c').fontSize(16).text('SMART TAG', 40, 20, { bold: true });
      doc.fillColor('#ffffff').fontSize(12).text('DİJİTAL PATİ KİMLİK & BASKI ŞABLONU', 40, 38);
      doc.fillColor('#94a3b8').fontSize(10).text(`SERİ: ${tagId.toUpperCase()} | PIN: ${tag.edit_pin}`, 380, 25, { align: 'right' });

      doc.fillColor('#0b0f19').fontSize(13).text('1. CÜZDAN KİMLİK KARTI (Kesip Cüzdanınızda Taşıyınız)', 40, 85, { bold: true });
      
      doc.roundedRect(40, 105, 300, 160, 10).fillAndStroke('#0f172a', '#334155');
      doc.rect(40, 105, 300, 25).fill('#ea580c');
      doc.fillColor('#ffffff').fontSize(10).text(`🐾 AKILLI PATİ KİMLİĞİ — ${p.name}`, 50, 112, { bold: true });
      doc.text('SMART TAG', 280, 112);

      doc.fillColor('#ffffff').fontSize(9).text(`İsim: ${p.name}`, 50, 140);
      doc.fillColor('#cbd5e1').fontSize(8).text(`Irk: ${p.breed}`, 50, 155);
      doc.text(`Yaş: ${p.age} | Cinsiyet: ${p.gender}`, 50, 170);
      doc.text(`Çip No: ${p.chip_no}`, 50, 185);
      doc.fillColor('#f87171').text(`Not: ${p.health_note.substring(0, 35)}...`, 50, 200);

      doc.image(qrBuffer, 250, 140, { width: 75 });
      doc.roundedRect(50, 230, 280, 20, 4).fill('#1e293b');
      doc.fillColor('#38bdf8').fontSize(7.5).text(`ACİL DURUMDA OKUTUNUZ / SAHİBİ: ${p.phone}`, 55, 236, { align: 'center', width: 270 });

      doc.fillColor('#0b0f19').fontSize(13).text('2. TASMA KÜNYE ETİKETLERİ', 360, 85, { bold: true });
      doc.circle(420, 180, 50).fillAndStroke('#0f172a', '#ea580c');
      doc.image(qrBuffer, 395, 155, { width: 50 });
      doc.fillColor('#ffffff').fontSize(8).text(p.name, 395, 140, { width: 50, align: 'center' });
      doc.fillColor('#38bdf8').fontSize(7).text('BENİ ARA', 395, 212, { width: 50, align: 'center' });

      doc.circle(520, 180, 42).fillAndStroke('#ea580c', '#0f172a');
      doc.image(qrBuffer, 500, 160, { width: 40 });
      doc.fillColor('#ffffff').fontSize(8).text(p.name, 500, 206, { width: 40, align: 'center' });

      doc.rect(40, 290, 515, 1).fill('#e2e8f0');
      doc.fillColor('#0b0f19').fontSize(13).text('3. BÜYÜK BOY TEST QR KODU & DÜZENLEME KILAVUZU', 40, 310, { bold: true });

      doc.roundedRect(40, 335, 180, 180, 10).fillAndStroke('#0f172a', '#ea580c');
      doc.image(qrBuffer, 50, 345, { width: 160 });

      doc.roundedRect(235, 335, 320, 180, 10).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0b0f19').fontSize(10).text('📱 NASIL ÇALIŞIR?', 250, 350, { bold: true });
      doc.fillColor('#334155').fontSize(8.5).text('• Bulan kişi kamerasıyla bu QR kodu okuttuğunda doğrudan profil açılır.\n• Herhangi bir uygulama indirmeden tek tıkla sizi arayabilir.', 250, 368, { width: 290 });

      doc.fillColor('#ea580c').fontSize(10).text('🔄 BİLGİLERİ NASIL GÜNCELLERSİNİZ?', 250, 415, { bold: true });
      doc.fillColor('#334155').fontSize(8.5).text(`• Numaranız değiştiğinde aşağıdaki bağlantıdan dilediğiniz an güncelleyin:\n  Link: ${fullUrl.replace('/t/', '/edit/')}\n  PIN Kodunuz: ${tag.edit_pin}`, 250, 433, { width: 290 });

      doc.rect(40, 750, 515, 40).fill('#0b0f19');
      doc.fillColor('#ffffff').fontSize(9).text('SMART TAG AKILLI DİJİTAL GÜVENLİK SİSTEMLERİ', 50, 765);
      doc.fillColor('#ea580c').text('300 DPI BASKI ŞABLONU', 420, 765, { align: 'right', width: 125 });

      doc.end();
    });
  });
});

// Admin Paneli (/admin)
app.get('/admin', (req, res) => {
  db.all('SELECT * FROM tags ORDER BY created_at DESC', (err, tags) => {
    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Smart Tag — Yönetici Paneli</title><style>${getCommonCSS()}</style></head>
      <body style="display:block; max-width:900px; margin:0 auto;">
        <h1 style="color:#ea580c; margin-bottom:6px;">🏷️ Smart Tag Yönetici Paneli</h1>
        <p style="color:#94a3b8; font-size:14px; margin-bottom:20px;">Gelen Shopier siparişlerini tek tıkla sisteme ekleyin, test edin ve A4 PDF çıktısını indirin.</p>

        <div style="background:#0f172a; border:1px dashed #ea580c; border-radius:18px; padding:20px; margin-bottom:30px;">
          <h3 style="color:#fff; margin-bottom:14px;">➕ Yeni Sipariş / Etiket Tanımla</h3>
          <form method="POST" action="/admin/create">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label>Özel Kod (Slug):</label>
                <input type="text" name="tag_id" placeholder="Örn: tarcin-002" required>
              </div>
              <div>
                <label>Müşteri PIN Kodu (4 Hane):</label>
                <input type="text" name="edit_pin" placeholder="Örn: 4821" maxlength="4" required>
              </div>
            </div>
            <label>Pati İsmi:</label>
            <input type="text" name="name" placeholder="Örn: LEO" required>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
              <div><label>Irk:</label><input type="text" name="breed" placeholder="Terrier"></div>
              <div><label>Yaş:</label><input type="text" name="age" placeholder="1 Yaş"></div>
              <div><label>Cinsiyet:</label><input type="text" name="gender" placeholder="Dişi"></div>
            </div>
            <label>İletişim Numarası (Arama):</label>
            <input type="text" name="phone" placeholder="+905xxxxxxxxx" required>
            <label>WhatsApp Numarası:</label>
            <input type="text" name="whatsapp" placeholder="905xxxxxxxxx" required>
            <label>Kayıtlı Adres / Semt:</label>
            <input type="text" name="address" placeholder="Kadıköy / İstanbul">
            <label>Sağlık & Davranış Notu:</label>
            <textarea name="health_note" rows="2" placeholder="Aşıları tamdır, uysaldır."></textarea>
            <label>Fotoğraf Linki (Opsiyonel):</label>
            <input type="text" name="photo_url" placeholder="https://...">
            <button type="submit" class="btn btn-orange" style="width:100%;">🚀 Etiketi Oluştur & Canlıya Al</button>
          </form>
        </div>

        <h3 style="color:#fff; margin-bottom:14px;">📋 Kayıtlı Akıllı Etiketler</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          ${tags.map(t => `
            <div style="background:#0f172a; border:1px solid #1e293b; border-radius:16px; padding:18px;">
              <span class="badge badge-blue">${t.type.toUpperCase()}</span>
              <h3 style="font-size:16px; margin-bottom:4px;">${t.title}</h3>
              <p style="font-size:12px; color:#94a3b8;">Kod: <code>/t/${t.id}</code> | PIN: <code>${t.edit_pin}</code></p>
              <div style="display:flex; gap:8px; margin-top:14px;">
                <a href="/t/${t.id}" target="_blank" class="btn btn-dark" style="flex:1; font-size:12px; padding:10px;">Görüntüle</a>
                <a href="/api/pdf/${t.id}" target="_blank" class="btn btn-green" style="flex:1; font-size:12px; padding:10px;">📄 PDF İndir</a>
              </div>
            </div>
          `).join('')}
        </div>
      </body></html>
    `);
  });
});

app.post('/admin/create', (req, res) => {
  const { tag_id, edit_pin, name, breed, age, gender, phone, whatsapp, address, health_note, photo_url } = req.body;
  const cleanId = tag_id.trim().toLowerCase();

  db.run("INSERT INTO tags (id, type, title, edit_pin) VALUES (?, 'pet', ?, ?)", 
    [cleanId, `${name} Pati Kimliği`, edit_pin], (err) => {
      if (err) return res.send('Bu Kod (Slug) zaten kullanımda!');

      db.run(`INSERT INTO pet_profiles VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?)`,
        [cleanId, name.toUpperCase(), breed, age, gender, address, phone, whatsapp, health_note, photo_url],
        () => res.redirect('/admin')
      );
  });
});

app.get('/', (req, res) => res.redirect('/admin'));

app.listen(PORT, () => {
  console.log(`Smart Tag Sistemi http://localhost:${PORT} portunda canlıda.`);
});
