import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GIZI_LABEL = [
  { key: 'energi', label: 'Energi', unit: 'kkal', integer: true },
  { key: 'protein', label: 'Protein', unit: 'gr' },
  { key: 'lemak', label: 'Lemak', unit: 'gr' },
  { key: 'karbohidrat', label: 'Karbohidrat', unit: 'gr' },
  { key: 'serat', label: 'Serat', unit: 'gr' },
];

const btn = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-transparent px-5 py-[11px] font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55';
const btnPrimary = `${btn} bg-leaf text-white hover:bg-leaf-dark`;
const btnDark = `${btn} bg-ink text-white hover:bg-[#26392f]`;
const btnGhost = `${btn} border-steel-deep bg-transparent hover:border-ink`;
const btnDanger = `${btn} bg-chili-tint !px-3.5 !py-2 text-chili hover:bg-[#f6d2ca]`;
const btnLink = 'cursor-pointer bg-transparent px-1 py-2 font-semibold text-leaf-dark underline underline-offset-4';
const input = 'w-full rounded-[10px] border-[1.5px] border-steel-deep bg-white px-3 py-[11px] transition hover:border-ink-soft focus:border-leaf focus:ring-4 focus:ring-leaf-tint focus:outline-none';
const panel = 'rounded-[14px] border border-line bg-white p-6';
const sub = 'mt-1.5 text-ink-soft';
const kosong = 'py-3 text-ink-soft';

function todayJakarta() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatTanggal(tanggal) {
  if (!tanggal) return '';
  return new Date(`${tanggal}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

function formatTanggalPendek(tanggal) {
  if (!tanggal) return '';
  return new Date(`${tanggal}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

async function request(path, { method = 'GET', json, form, token } = {}) {
  const headers = {};
  let body;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  if (form) body = form;

  let res;
  try {
    res = await fetch(API + path, { method, headers, body });
  } catch {
    throw Object.assign(new Error('Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.'), { status: 0 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Terjadi kesalahan. Coba lagi.'), { status: res.status });
  return data;
}

const fotoSrc = (url) => (url ? (url.startsWith('http') ? url : API + url) : null);

function waktuLalu(iso) {
  const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function Field({ label, htmlFor, className = '', children }) {
  return (
    <div className={`mt-4 flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[0.95rem] font-semibold">{label}</label>
      {children}
    </div>
  );
}

function Chip({ peran }) {
  const warna = peran === 'Guru' ? 'bg-turmeric-tint text-[#7a5600]' : 'bg-leaf-tint text-leaf-dark';
  return <span className={`rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold ${warna}`}>{peran}</span>;
}

function PesanList({ items, onHapus }) {
  return (
    <ul className="mt-3.5 flex flex-col gap-2.5">
      {items.map((p) => (
        <li key={p.id} className="rounded-xl border border-line bg-[#fafbfa] px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{p.pengirim}</strong>
            <Chip peran={p.peran} />
            <time className="text-sm text-ink-soft">{waktuLalu(p.tanggal)}</time>
            {onHapus && (
              <button className="ml-auto cursor-pointer text-sm font-semibold text-chili underline underline-offset-4" onClick={() => onHapus(p)}>
                Hapus
              </button>
            )}
          </div>
          <p className="mt-1 [overflow-wrap:anywhere]">{p.pesan}</p>
        </li>
      ))}
    </ul>
  );
}

function DaftarMenu({ items }) {
  return (
    <div>
      <h2 className="text-[1.35rem]">Menu hari ini</h2>
      <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
        {items.map((nama, i) => (
          <li key={`${nama}-${i}`} className="rounded-xl border border-line bg-[#fafbfa] px-4 py-3">
            <span className="mr-2 text-ink-soft">{i + 1}.</span>
            <strong>{nama}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabelGizi({ gizi }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line">
      <div className="bg-ink px-5 py-4 text-white">
        <h2 className="text-[1.35rem]">Kandungan gizi</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="bg-[#f3f6f4] text-left">
              <th className="border-b border-line px-4 py-3 font-semibold">Kandungan</th>
              <th className="border-b border-line px-4 py-3 text-center font-semibold">Porsi Kecil</th>
              <th className="border-b border-line px-4 py-3 text-center font-semibold">Porsi Besar</th>
            </tr>
          </thead>
          <tbody>
            {GIZI_LABEL.map((item) => (
              <tr key={item.key}>
                <td className="border-b border-line px-4 py-3 font-semibold">{item.label}</td>
                <td className="border-b border-line px-4 py-3 text-center"><strong>{gizi.kecil[item.key]}</strong> {item.unit}</td>
                <td className="border-b border-line px-4 py-3 text-center"><strong>{gizi.besar[item.key]}</strong> {item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MenuHariIni({ menu }) {
  if (!menu?.foto_ompreng && !menu?.items?.length) {
    return (
      <section className={`${panel} py-12 text-center`}>
        <h2 className="text-[1.35rem]">Menu hari ini belum diunggah</h2>
        <p className={sub}>Dapur belum memasukkan menu. Coba cek lagi menjelang jam makan siang.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-line bg-white p-[18px] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="rounded-[26px] border border-steel-deep bg-[linear-gradient(145deg,#dbe3df,#c3ceca)] p-3.5 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_6px_18px_rgba(22,38,31,0.12)]">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#eef2ef] shadow-[inset_0_3px_8px_rgba(22,38,31,0.16)]">
            {menu.foto_ompreng && <img src={fotoSrc(menu.foto_ompreng)} alt="Foto ompreng makan siang hari ini" className="h-full w-full object-cover" />}
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <DaftarMenu items={menu.items} />
          <p className="mt-4 text-sm text-ink-soft">Menu makan siang SPPG Jatibaru 007</p>
        </div>
      </div>
      <TabelGizi gizi={menu.gizi} />
    </section>
  );
}

function Masukan({ pesan, onSent, notify }) {
  const [form, setForm] = useState({ pengirim: '', peran: 'Murid', pesan: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function kirim(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await request('/api/pesan', { method: 'POST', json: form });
      setForm({ ...form, pesan: '' });
      notify('Masukan terkirim. Terima kasih!');
      onSent();
    } catch (err) {
      notify(err.message, 'err');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <section className={panel} aria-labelledby="judul-masukan">
        <h2 id="judul-masukan" className="text-[1.35rem]">Kirim masukan untuk dapur</h2>
        <p className={sub}>Rasa, porsi, atau kebersihan makanan hari ini. Semua masukan dibaca tim dapur.</p>
        <form onSubmit={kirim}>
          <div className="flex flex-wrap gap-3.5">
            <Field label="Nama" htmlFor="nama" className="min-w-[180px] flex-1"><input id="nama" className={input} value={form.pengirim} onChange={set('pengirim')} maxLength={100} required /></Field>
            <Field label="Peran" htmlFor="peran"><select id="peran" className={input} value={form.peran} onChange={set('peran')}><option>Murid</option><option>Guru</option></select></Field>
          </div>
          <Field label="Masukan" htmlFor="isi">
            <textarea id="isi" rows={4} className={`${input} resize-y`} value={form.pesan} onChange={set('pesan')} maxLength={500} placeholder="Contoh: Sayurnya segar, tapi sambalnya terlalu pedas." required />
            <small className="self-end text-[0.8rem] text-ink-soft">{form.pesan.length}/500</small>
          </Field>
          <button className={`${btnPrimary} mt-4 w-full`} disabled={loading}>{loading ? 'Mengirim…' : 'Kirim masukan'}</button>
        </form>
      </section>

      <section className={panel} aria-labelledby="judul-pesan">
        <h2 id="judul-pesan" className="text-[1.35rem]">Masukan terbaru</h2>
        {pesan.length === 0 ? <p className={kosong}>Belum ada masukan. Jadi yang pertama memberi masukan.</p> : <PesanList items={pesan.slice(0, 6)} />}
      </section>
    </div>
  );
}

function Login({ onLogin, onBack, notify }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function masuk(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await request('/api/login', { method: 'POST', json: form });
      onLogin(token);
    } catch (err) {
      notify(err.message, 'err');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-[1120px] justify-center px-5 pt-10 pb-12">
      <form className={`${panel} w-full max-w-[420px]`} onSubmit={masuk}>
        <h1 className="text-[clamp(1.7rem,3vw,2.2rem)]">Masuk admin dapur</h1>
        <p className={sub}>Khusus petugas SPPG untuk mengelola menu harian.</p>
        <Field label="Username" htmlFor="u"><input id="u" className={input} autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></Field>
        <Field label="Password" htmlFor="p"><input id="p" type="password" className={input} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
        <button className={`${btnPrimary} mt-5 w-full`} disabled={loading}>{loading ? 'Memeriksa…' : 'Masuk'}</button>
        <button type="button" className={`${btnLink} mt-2 w-full`} onClick={onBack}>Kembali ke halaman menu</button>
      </form>
    </main>
  );
}

function kosongGizi() {
  return {
    kecil: { energi: '', protein: '', lemak: '', karbohidrat: '', serat: '' },
    besar: { energi: '', protein: '', lemak: '', karbohidrat: '', serat: '' },
  };
}

function isiGizi(gizi) {
  const hasil = kosongGizi();
  for (const ukuran of ['kecil', 'besar']) {
    for (const item of GIZI_LABEL) {
      const nilai = gizi?.[ukuran]?.[item.key];
      hasil[ukuran][item.key] = nilai === null || nilai === undefined ? '' : String(nilai);
    }
  }
  return hasil;
}

function Admin({ token, pesan, logout, notify }) {
  const [tanggal, setTanggal] = useState(todayJakarta());
  const [menu, setMenu] = useState(null);
  const [history, setHistory] = useState([]);
  const [rows, setRows] = useState(['', '', '', '', '']);
  const [gizi, setGizi] = useState(kosongGizi());
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);

  const resetForm = useCallback((data) => {
    setMenu(data);
    setRows(data?.items?.length ? [...data.items] : ['', '', '', '', '']);
    setGizi(isiGizi(data?.gizi));
    setFoto(null);
    setPreview(null);
    setFileKey((v) => v + 1);
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await request('/api/menu-riwayat', { token });
    setHistory(data);
  }, [token]);

  const loadTanggal = useCallback(async (value) => {
    setLoadingDate(true);
    try {
      const data = await request(`/api/menu/${value}`);
      resetForm(data);
    } catch (err) {
      if (err.status === 401) logout();
      else notify(err.message, 'err');
    } finally {
      setLoadingDate(false);
    }
  }, [notify, resetForm, logout]);

  useEffect(() => {
    loadTanggal(tanggal);
    loadHistory().catch((err) => {
      if (err.status === 401) logout();
      else notify(err.message, 'err');
    });
  }, []);

  const adaData = !!(menu?.items?.length || menu?.foto_ompreng);

  const ubahBaris = (i, value) => setRows(rows.map((r, idx) => (idx === i ? value : r)));
  const tambahBaris = () => setRows([...rows, '']);
  const hapusBaris = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const ubahGizi = (ukuran, key, value) => setGizi({ ...gizi, [ukuran]: { ...gizi[ukuran], [key]: value } });

  function pilihFoto(e) {
    const f = e.target.files?.[0] || null;
    setFoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function pilihRiwayat(item) {
    setTanggal(item.tanggal.slice(0, 10));
    loadTanggal(item.tanggal.slice(0, 10));
  }

  function menuBaru() {
    setTanggal(todayJakarta());
    resetForm({ tanggal: todayJakarta(), foto_ompreng: null, items: [], gizi: kosongGizi() });
  }

  async function simpan(e) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData();
    fd.append('items', JSON.stringify(rows.map((r) => r.trim())));
    fd.append('gizi', JSON.stringify(gizi));
    if (foto) fd.append('foto', foto);

    try {
      const data = await request(`/api/menu/${tanggal}`, { method: 'PUT', form: fd, token });
      resetForm(data);
      await loadHistory();
      notify(adaData ? `Menu ${formatTanggalPendek(tanggal)} berhasil diperbarui.` : `Menu ${formatTanggalPendek(tanggal)} berhasil disimpan.`);
    } catch (err) {
      if (err.status === 401) logout();
      else notify(err.message, 'err');
    } finally {
      setLoading(false);
    }
  }

  async function hapusMenu(itemTanggal) {
    const yakin = window.confirm(`Hapus menu tanggal ${formatTanggalPendek(itemTanggal)}?`);
    if (!yakin) return;
    try {
      await request(`/api/menu/${itemTanggal}`, { method: 'DELETE', token });
      await loadHistory();
      if (tanggal === itemTanggal.slice(0, 10)) resetForm({ tanggal: itemTanggal, foto_ompreng: null, items: [], gizi: kosongGizi() });
      notify('Menu berhasil dihapus.');
    } catch (err) {
      if (err.status === 401) logout();
      else notify(err.message, 'err');
    }
  }

  const fotoTampil = preview || fotoSrc(menu?.foto_ompreng);

  const jumlahMenu = useMemo(() => rows.filter((r) => r.trim()).length, [rows]);

  return (
    <main className="mx-auto max-w-[1120px] px-5 pt-2 pb-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.7rem,3vw,2.2rem)]">Dashboard admin</h1>
          <p className={sub}>Kelola banyak menu berdasarkan tanggal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => window.location.reload()}>Halaman utama</button>
          <button className={btnGhost} onClick={logout}>Keluar</button>
        </div>
      </div>

      <section className={`${panel} mb-5`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Tanggal menu" htmlFor="tanggal" className="mt-0">
              <input id="tanggal" type="date" className={input} value={tanggal} onChange={(e) => { setTanggal(e.target.value); loadTanggal(e.target.value); }} />
            </Field>
          </div>
          <button className={btnDark} type="button" onClick={menuBaru}>Buat menu baru</button>
        </div>
        <p className={sub}>{loadingDate ? 'Mengambil data tanggal...' : adaData ? `Sedang mengedit menu ${formatTanggalPendek(tanggal)}.` : `Belum ada menu untuk ${formatTanggalPendek(tanggal)}. Kamu bisa upload sekarang.`}</p>
      </section>

      <form onSubmit={simpan} className={`${panel} mb-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.35rem]">Upload menu {formatTanggalPendek(tanggal)}</h2>
            <p className={sub}>Setelah disimpan, kamu masih bisa memilih tanggal lain untuk upload menu berikutnya.</p>
          </div>
          {adaData && <button type="button" className={btnDanger} onClick={() => hapusMenu(tanggal)}>Hapus menu ini</button>}
        </div>

        <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <Field label="Foto ompreng (JPG, PNG, WebP, maksimal 3 MB)" htmlFor="ft">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-[repeating-linear-gradient(45deg,#f3f6f4_0_8px,#eaefec_8px_16px)]">
              {fotoTampil ? <img src={fotoTampil} alt="Pratinjau foto ompreng" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center text-sm text-ink-soft">Belum ada foto</div>}
            </div>
            <input key={fileKey} id="ft" type="file" className={`${input} !p-[9px]`} accept="image/jpeg,image/png,image/webp" onChange={pilihFoto} />
          </Field>

          <div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[0.95rem] font-semibold">Isi menu</span>
              <span className="text-sm text-ink-soft">{jumlahMenu} menu</span>
            </div>

            <ul className="mt-1.5 flex flex-col gap-2.5">
              {rows.map((nama, i) => (
                <li key={i} className="grid items-center gap-2 rounded-xl border border-line p-3 sm:grid-cols-[auto_1fr_auto]">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf-tint font-display font-bold text-leaf-dark">{i + 1}</span>
                  <input className={input} aria-label={`Nama menu ${i + 1}`} placeholder="Contoh: Nasi" value={nama} onChange={(e) => ubahBaris(i, e.target.value)} maxLength={100} required />
                  <button type="button" className={`${btnLink} justify-self-start !text-chili`} onClick={() => hapusBaris(i)} disabled={rows.length <= 1}>Hapus</button>
                </li>
              ))}
            </ul>

            {rows.length < 12 && <button type="button" className={`${btnLink} mt-2`} onClick={tambahBaris}>Tambah menu</button>}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          <div className="bg-ink px-5 py-4 text-white">
            <h3 className="font-display text-lg font-bold">Kandungan gizi</h3>
            <p className="mt-1 text-sm text-white/75">Masukkan nilai porsi kecil dan porsi besar seperti format informasi gizi.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse">
              <thead>
                <tr className="bg-[#f3f6f4] text-left">
                  <th className="border-b border-line px-4 py-3 font-semibold">Kandungan</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Porsi Kecil</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Porsi Besar</th>
                </tr>
              </thead>
              <tbody>
                {GIZI_LABEL.map((item) => (
                  <tr key={item.key}>
                    <td className="border-b border-line px-4 py-3 font-semibold">{item.label} <span className="font-normal text-ink-soft">({item.unit})</span></td>
                    <td className="border-b border-line px-4 py-3">
                      <input className={input} type="number" min="0" max={item.integer ? '3000' : '1000'} step={item.integer ? '1' : '0.1'} value={gizi.kecil[item.key]} onChange={(e) => ubahGizi('kecil', item.key, e.target.value)} placeholder="0" required />
                    </td>
                    <td className="border-b border-line px-4 py-3">
                      <input className={input} type="number" min="0" max={item.integer ? '3000' : '1000'} step={item.integer ? '1' : '0.1'} value={gizi.besar[item.key]} onChange={(e) => ubahGizi('besar', item.key, e.target.value)} placeholder="0" required />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button className={`${btnPrimary} mt-6 w-full`} disabled={loading || loadingDate}>{loading ? 'Menyimpan…' : adaData ? 'Simpan perubahan menu' : 'Simpan menu'}</button>
      </form>

      <section className={`${panel} mb-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[1.35rem]">Riwayat menu</h2>
            <p className={sub}>Setiap tanggal disimpan terpisah, jadi kamu bisa upload menu lagi kapan saja.</p>
          </div>
          <button className={btnGhost} onClick={loadHistory}>Muat ulang</button>
        </div>

        {history.length === 0 ? (
          <p className={kosong}>Belum ada menu tersimpan.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-[#f3f6f4] text-left">
                  <th className="border-b border-line px-4 py-3">Tanggal</th>
                  <th className="border-b border-line px-4 py-3">Jumlah menu</th>
                  <th className="border-b border-line px-4 py-3">Foto</th>
                  <th className="border-b border-line px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.tanggal}>
                    <td className="border-b border-line px-4 py-3 font-semibold">{formatTanggalPendek(item.tanggal)}</td>
                    <td className="border-b border-line px-4 py-3">{item.jumlah_menu} menu</td>
                    <td className="border-b border-line px-4 py-3">{item.foto_ompreng ? 'Sudah ada' : 'Belum ada'}</td>
                    <td className="border-b border-line px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className={btnGhost} type="button" onClick={() => pilihRiwayat(item)}>Edit</button>
                        <button className={btnDanger} type="button" onClick={() => hapusMenu(item.tanggal.slice(0, 10))}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={panel} aria-labelledby="pesan-admin">
        <h2 id="pesan-admin" className="text-[1.35rem]">Masukan dari murid dan guru</h2>
        {pesan.length === 0 ? <p className={kosong}>Belum ada masukan masuk.</p> : <PesanList items={pesan} onHapus={async (p) => { try { await request(`/api/pesan/${p.id}`, { method: 'DELETE', token }); notify('Masukan dihapus.'); } catch (err) { if (err.status === 401) logout(); else notify(err.message, 'err'); } }} />}
      </section>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState('publik');
  const [token, setToken] = useState(() => localStorage.getItem('mbg_token') || '');
  const [menu, setMenu] = useState({
    tanggal: null,
    foto_ompreng: null,
    items: [],
    gizi: { kecil: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 }, besar: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 } },
  });
  const [pesan, setPesan] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const reloadPublik = useCallback(() => {
    request('/api/menu-hari-ini').then(setMenu).catch((e) => notify(e.message, 'err'));
    request('/api/pesan').then(setPesan).catch(() => {});
  }, [notify]);

  useEffect(() => {
    reloadPublik();
  }, [reloadPublik]);

  const login = (t) => {
    localStorage.setItem('mbg_token', t);
    setToken(t);
    setView('admin');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('mbg_token');
    setToken('');
    setView('publik');
  }, []);

  return (
    <>
      <header className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-5 py-[18px]">
        <button className="flex cursor-pointer items-center gap-3 bg-transparent p-0 text-left" onClick={() => setView('publik')} aria-label="Ke halaman menu">
          <span className="grid h-9 w-11 grid-cols-[1.4fr_1fr] grid-rows-2 gap-[3px] rounded-lg border border-steel-deep bg-steel p-1" aria-hidden="true">
            <i className="row-span-2 rounded-[3px] bg-leaf" />
            <i className="rounded-[3px] bg-turmeric" />
            <i className="rounded-[3px] bg-white" />
          </span>
          <span>
            <strong className="block font-display text-[1.15rem] font-extrabold text-leaf-dark">Dapur MBG Jatibaru 007</strong>
            <small className="hidden text-[0.85rem] text-ink-soft sm:block">Menu dan kandungan gizi makan siang</small>
          </span>
        </button>
        {view === 'publik' && <button className={btnDark} onClick={() => setView(token ? 'admin' : 'login')}>{token ? 'Buka dashboard' : 'Masuk admin'}</button>}
      </header>

      {view === 'publik' && (
        <main className="mx-auto max-w-[1120px] px-5 pt-2 pb-12">
          <div className="mb-3.5 font-medium text-ink-soft">{formatTanggal(todayJakarta())}</div>
          <MenuHariIni menu={menu} />
          <Masukan pesan={pesan} onSent={reloadPublik} notify={notify} />
        </main>
      )}

      {view === 'login' && <Login onLogin={login} onBack={() => setView('publik')} notify={notify} />}
      {view === 'admin' && token && <Admin token={token} pesan={pesan} logout={logout} notify={notify} />}

      <footer className="px-5 pb-8 text-center text-[0.88rem] text-ink-soft">SPPG 007 Tanjung Bintang · Program Makan Bergizi Gratis</footer>

      {toast && (
        <div className="pointer-events-none fixed inset-x-4 bottom-6 z-10 flex justify-center">
          <div role="status" className={`animate-naik rounded-xl px-5 py-3 font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${toast.type === 'err' ? 'bg-chili' : 'bg-leaf-dark'}`}>
            {toast.text}
          </div>
        </div>
      )}
    </>
  );
}
