const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Increase limit body-parser untuk menampung gambar Base64
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// PIN Admin bawaan (bisa diatur lewat .env ADMIN_PIN=123456)
const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

// 1. GET ALL MENUS (Data menu yang dimasukkan admin)
app.get('/api/menus', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menus ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data menu.' });
  }
});

// 2. POST TAMBAH MENU (Khusus Admin)
app.post('/api/menus', async (req, res) => {
  const { nama_menu, kategori, kalori, foto_url, pin } = req.body;

  // Verifikasi PIN Admin
  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ success: false, message: 'PIN Admin Salah!' });
  }

  if (!nama_menu || !kategori || !kalori) {
    return res.status(400).json({ success: false, message: 'Nama, kategori, dan kalori wajib diisi.' });
  }

  try {
    const query = `
      INSERT INTO menus (nama_menu, kategori, kalori, foto_url) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const result = await pool.query(query, [nama_menu, kategori, parseInt(kalori), foto_url || '']);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan menu.' });
  }
});

// 3. DELETE MENU (Khusus Admin)
app.delete('/api/menus/:id', async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ success: false, message: 'PIN Admin Salah!' });
  }

  try {
    await pool.query('DELETE FROM menus WHERE id = $1', [id]);
    res.json({ success: true, message: 'Menu berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus menu.' });
  }
});

// 4. HITUNG KALORI OMPRENG
app.post('/api/hitung-kalori', (req, res) => {
  const { karbo, hewani, nabati, sayur, buah } = req.body;
  
  const totalKalori = 
    (karbo?.kalori || 0) + 
    (hewani?.kalori || 0) + 
    (nabati?.kalori || 0) + 
    (sayur?.kalori || 0) + 
    (buah?.kalori || 0);

  const status = totalKalori >= 600 ? "Memenuhi Standar MBG 🍱" : "Kalori Belum Cukup ⚠️";

  res.json({
    success: true,
    data: { total_kalori: totalKalori, status }
  });
});

// 5. PESAN MASUK (FEEDBACK)
app.post('/api/pesan', async (req, res) => {
  const { pengirim, peran, pesan } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pesan_masuk (pengirim, peran, pesan) VALUES ($1, $2, $3) RETURNING *',
      [pengirim, peran, pesan]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan pesan.' });
  }
});

app.get('/api/pesan', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pesan_masuk ORDER BY tanggal DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan.' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Backend run on port ${PORT}`));
}

module.exports = app;