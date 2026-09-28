import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  DATABASE_URL,
  JWT_SECRET,
  PORT = 3000,
  FRONTEND_ORIGIN = 'http://localhost:5173',
  PGSSL,
} = process.env;

if (!DATABASE_URL || !JWT_SECRET) {
  console.error('DATABASE_URL dan JWT_SECRET wajib diisi di file .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const PERAN = ['Murid', 'Guru'];
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = EXT[file.mimetype];
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    cb(new Error('Foto harus berformat JPG, PNG, atau WebP.'));
  },
});

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '50kb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user.role !== 'admin') throw new Error('bukan admin');
    next();
  } catch {
    res.status(401).json({ error: 'Sesi berakhir. Silakan masuk lagi.' });
  }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi 15 menit lagi.' },
});

const pesanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Kamu sudah mengirim beberapa pesan. Tunggu sebentar sebelum mengirim lagi.' },
});

function hapusFile(url) {
  if (!url) return;
  const nama = path.basename(url);
  if (!nama) return;
  fs.unlink(path.join(uploadDir, nama), () => {});
}

function tanggalValid(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function angka(value, integer = false, max = 1000) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  if (integer && !Number.isInteger(n)) return null;
  return n;
}

function bersihkanGizi(input) {
  const sumber = input && typeof input === 'object' ? input : {};
  const kecil = sumber.kecil && typeof sumber.kecil === 'object' ? sumber.kecil : {};
  const besar = sumber.besar && typeof sumber.besar === 'object' ? sumber.besar : {};

  const hasil = {
    energi_kecil: angka(kecil.energi, true, 3000),
    protein_kecil: angka(kecil.protein, false, 1000),
    lemak_kecil: angka(kecil.lemak, false, 1000),
    karbo_kecil: angka(kecil.karbohidrat, false, 1000),
    serat_kecil: angka(kecil.serat, false, 1000),
    energi_besar: angka(besar.energi, true, 3000),
    protein_besar: angka(besar.protein, false, 1000),
    lemak_besar: angka(besar.lemak, false, 1000),
    karbo_besar: angka(besar.karbohidrat, false, 1000),
    serat_besar: angka(besar.serat, false, 1000),
  };

  if (Object.values(hasil).some((v) => v === null)) return null;
  return hasil;
}

function formatGizi(data) {
  return {
    kecil: {
      energi: Number(data.energi_kecil || 0),
      protein: Number(data.protein_kecil || 0),
      lemak: Number(data.lemak_kecil || 0),
      karbohidrat: Number(data.karbo_kecil || 0),
      serat: Number(data.serat_kecil || 0),
    },
    besar: {
      energi: Number(data.energi_besar || 0),
      protein: Number(data.protein_besar || 0),
      lemak: Number(data.lemak_besar || 0),
      karbohidrat: Number(data.karbo_besar || 0),
      serat: Number(data.serat_besar || 0),
    },
  };
}

function kosongMenu() {
  return {
    tanggal: null,
    foto_ompreng: null,
    items: [],
    gizi: {
      kecil: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 },
      besar: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 },
    },
  };
}

async function ambilMenu(tanggal) {
  const { rows } = await pool.query(
    `SELECT tanggal, foto_ompreng, items, energi_kecil, protein_kecil, lemak_kecil, karbo_kecil, serat_kecil, energi_besar, protein_besar, lemak_besar, karbo_besar, serat_besar
     FROM menu_harian
     WHERE tanggal = $1
     LIMIT 1`,
    [tanggal]
  );

  if (!rows.length) return { ...kosongMenu(), tanggal };

  const row = rows[0];
  let items = [];

  if (Array.isArray(row.items)) items = row.items;
  else if (typeof row.items === 'string') {
    try {
      const parsed = JSON.parse(row.items);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }
  }

  return {
    tanggal: row.tanggal,
    foto_ompreng: row.foto_ompreng || null,
    items,
    gizi: formatGizi(row),
  };
}

app.post('/api/login', loginLimiter, wrap(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
  const user = rows[0];
  let valid = false;

  if (user) {
    if (typeof user.password === 'string' && user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password);
    } else if (user.password === password) {
      valid = true;
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
    }
  }

  if (!valid) return res.status(401).json({ error: 'Username atau password salah.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, username: user.username });
}));

app.get('/api/menu-hari-ini', wrap(async (_req, res) => {
  const { rows } = await pool.query("SELECT CURRENT_DATE AT TIME ZONE 'Asia/Jakarta' AS tanggal");
  res.json(await ambilMenu(rows[0].tanggal));
}));

app.get('/api/menu/:tanggal', wrap(async (req, res) => {
  const { tanggal } = req.params;
  if (!tanggalValid(tanggal)) return res.status(400).json({ error: 'Tanggal tidak valid.' });
  res.json(await ambilMenu(tanggal));
}));

app.get('/api/menu-riwayat', auth, wrap(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT tanggal, foto_ompreng, items, energi_kecil, protein_kecil, lemak_kecil, karbo_kecil, serat_kecil, energi_besar, protein_besar, lemak_besar, karbo_besar, serat_besar
     FROM menu_harian
     ORDER BY tanggal DESC
     LIMIT 60`
  );

  res.json(rows.map((row) => ({
    tanggal: row.tanggal,
    foto_ompreng: row.foto_ompreng,
    jumlah_menu: Array.isArray(row.items) ? row.items.length : 0,
    gizi: formatGizi(row),
  })));
}));

app.put('/api/menu/:tanggal', auth, upload.single('foto'), wrap(async (req, res) => {
  const tanggal = req.params.tanggal;

  const tolak = (msg) => {
    if (req.file) hapusFile(`/uploads/${req.file.filename}`);
    return res.status(400).json({ error: msg });
  };

  if (!tanggalValid(tanggal)) return tolak('Tanggal tidak valid.');

  let items;
  let gizi;

  try {
    items = JSON.parse(req.body.items || '[]');
    gizi = JSON.parse(req.body.gizi || '{}');
  } catch {
    return tolak('Data menu atau kandungan gizi tidak valid.');
  }

  if (!Array.isArray(items) || items.length < 1 || items.length > 12) {
    return tolak('Isi 1 sampai 12 menu.');
  }

  const daftarMenu = items.map((nama) => String(nama || '').trim());

  if (daftarMenu.some((nama) => !nama || nama.length > 100)) {
    return tolak('Nama menu wajib diisi dan maksimal 100 karakter.');
  }

  const giziBersih = bersihkanGizi(gizi);
  if (!giziBersih) return tolak('Nilai kandungan gizi tidak valid.');

  const { rows } = await pool.query(
    'SELECT foto_ompreng FROM menu_harian WHERE tanggal = $1 LIMIT 1',
    [tanggal]
  );

  const fotoLama = rows[0]?.foto_ompreng || null;
  const fotoBaru = req.file ? `/uploads/${req.file.filename}` : null;

  if (!fotoBaru && !fotoLama) return tolak('Foto ompreng wajib diunggah.');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO menu_harian (
        tanggal, foto_ompreng, items,
        energi_kecil, protein_kecil, lemak_kecil, karbo_kecil, serat_kecil,
        energi_besar, protein_besar, lemak_besar, karbo_besar, serat_besar
      ) VALUES (
        $1, $2, $3::jsonb,
        $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13
      )
      ON CONFLICT (tanggal) DO UPDATE SET
        foto_ompreng = EXCLUDED.foto_ompreng,
        items = EXCLUDED.items,
        energi_kecil = EXCLUDED.energi_kecil,
        protein_kecil = EXCLUDED.protein_kecil,
        lemak_kecil = EXCLUDED.lemak_kecil,
        karbo_kecil = EXCLUDED.karbo_kecil,
        serat_kecil = EXCLUDED.serat_kecil,
        energi_besar = EXCLUDED.energi_besar,
        protein_besar = EXCLUDED.protein_besar,
        lemak_besar = EXCLUDED.lemak_besar,
        karbo_besar = EXCLUDED.karbo_besar,
        serat_besar = EXCLUDED.serat_besar`,
      [
        tanggal,
        fotoBaru || fotoLama,
        JSON.stringify(daftarMenu),
        giziBersih.energi_kecil,
        giziBersih.protein_kecil,
        giziBersih.lemak_kecil,
        giziBersih.karbo_kecil,
        giziBersih.serat_kecil,
        giziBersih.energi_besar,
        giziBersih.protein_besar,
        giziBersih.lemak_besar,
        giziBersih.karbo_besar,
        giziBersih.serat_besar,
      ]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (fotoBaru) hapusFile(fotoBaru);
    throw err;
  } finally {
    client.release();
  }

  if (fotoBaru && fotoLama && fotoBaru !== fotoLama) hapusFile(fotoLama);

  res.json(await ambilMenu(tanggal));
}));

app.delete('/api/menu/:tanggal', auth, wrap(async (req, res) => {
  const tanggal = req.params.tanggal;
  if (!tanggalValid(tanggal)) return res.status(400).json({ error: 'Tanggal tidak valid.' });

  const { rows } = await pool.query(
    'DELETE FROM menu_harian WHERE tanggal = $1 RETURNING foto_ompreng',
    [tanggal]
  );

  hapusFile(rows[0]?.foto_ompreng);
  res.json({ ok: true });
}));

app.get('/api/pesan', wrap(async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, pengirim, peran, pesan, tanggal FROM pesan_masuk ORDER BY tanggal DESC LIMIT 20'
  );
  res.json(rows);
}));

app.post('/api/pesan', pesanLimiter, wrap(async (req, res) => {
  const pengirim = String(req.body.pengirim || '').trim();
  const peran = String(req.body.peran || '');
  const pesan = String(req.body.pesan || '').trim();

  if (!pengirim || pengirim.length > 100) return res.status(400).json({ error: 'Nama wajib diisi.' });
  if (!PERAN.includes(peran)) return res.status(400).json({ error: 'Peran harus Murid atau Guru.' });
  if (pesan.length < 3 || pesan.length > 500) return res.status(400).json({ error: 'Pesan harus 3–500 karakter.' });

  const { rows } = await pool.query(
    'INSERT INTO pesan_masuk (pengirim, peran, pesan) VALUES ($1, $2, $3) RETURNING *',
    [pengirim, peran, pesan]
  );

  res.status(201).json(rows[0]);
}));

app.delete('/api/pesan/:id', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM pesan_masuk WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran foto maksimal 3 MB.' : 'Upload foto gagal.';
    return res.status(400).json({ error: msg });
  }

  if (err?.message?.startsWith('Foto harus')) return res.status(400).json({ error: err.message });

  console.error(err);
  res.status(500).json({ error: err?.message || 'Terjadi kesalahan di server.' });
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_harian (
      tanggal DATE PRIMARY KEY,
      foto_ompreng TEXT NOT NULL
    )
  `);

  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS items JSONB`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS energi_kecil NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS protein_kecil NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS lemak_kecil NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS karbo_kecil NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS serat_kecil NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS energi_besar NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS protein_besar NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS lemak_besar NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS karbo_besar NUMERIC(10,1)`);
  await pool.query(`ALTER TABLE menu_harian ADD COLUMN IF NOT EXISTS serat_besar NUMERIC(10,1)`);

  await pool.query(`ALTER TABLE menu_harian ALTER COLUMN items SET DEFAULT '[]'::jsonb`);
  await pool.query(`UPDATE menu_harian SET items = '[]'::jsonb WHERE items IS NULL`);
  await pool.query(`ALTER TABLE menu_harian ALTER COLUMN items SET NOT NULL`);

  const kolomAngka = [
    'energi_kecil', 'protein_kecil', 'lemak_kecil', 'karbo_kecil', 'serat_kecil',
    'energi_besar', 'protein_besar', 'lemak_besar', 'karbo_besar', 'serat_besar',
  ];

  for (const nama of kolomAngka) {
    await pool.query(`UPDATE menu_harian SET ${nama} = 0 WHERE ${nama} IS NULL`);
    await pool.query(`ALTER TABLE menu_harian ALTER COLUMN ${nama} SET DEFAULT 0`);
    await pool.query(`ALTER TABLE menu_harian ALTER COLUMN ${nama} SET NOT NULL`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesan_masuk (
      id SERIAL PRIMARY KEY,
      pengirim VARCHAR(100) NOT NULL,
      peran VARCHAR(20) NOT NULL,
      pesan VARCHAR(500) NOT NULL,
      tanggal TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function start() {
  try {
    await pool.query('SELECT 1');
    await initDb();
    app.listen(PORT, () => console.log(`API berjalan di http://localhost:${PORT}`));
  } catch (err) {
    console.error('Gagal menjalankan server:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

start();
