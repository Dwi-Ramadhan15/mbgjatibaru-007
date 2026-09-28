import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  
  // Data dari database
  const [menuList, setMenuList] = useState([]);
  const [pesanList, setPesanList] = useState([]);

  // State Kalkulator Ompreng
  const [ompreng, setOmpreng] = useState({ karbo: null, hewani: null, nabati: null, sayur: null, buah: null });
  const [hasilKalori, setHasilKalori] = useState({ total_kalori: 0, status: 'Pilih menu' });

  // State Form Tambah Menu Admin
  const [formMenu, setFormMenu] = useState({ nama_menu: '', kategori: 'karbo', kalori: '', foto_url: '' });

  // State Form Pesan
  const [formPesan, setFormPesan] = useState({ pengirim: '', peran: 'Murid', pesan: '' });

  useEffect(() => {
    fetchMenus();
    fetchPesan();
  }, []);

  useEffect(() => {
    // Hitung kalori otomatis saat isi ompreng berubah
    const hitungKalori = async () => {
      try {
        const res = await fetch(`${API_URL}/hitung-kalori`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ompreng)
        });
        const data = await res.json();
        if (data.success) setHasilKalori(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    hitungKalori();
  }, [ompreng]);

  const fetchMenus = async () => {
    try {
      const res = await fetch(`${API_URL}/menus`);
      const data = await res.json();
      if (data.success) setMenuList(data.data);
    } catch (err) { console.error(err); }
  };

  const fetchPesan = async () => {
    try {
      const res = await fetch(`${API_URL}/pesan`);
      const data = await res.json();
      if (data.success) setPesanList(data.data);
    } catch (err) { console.error(err); }
  };

  // Convert Upload Gambar ke Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormMenu({ ...formMenu, foto_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Menu Baru (Admin)
  const submitMenu = async (e) => {
    e.preventDefault();
    if (!adminPin) return alert("Masukkan PIN Admin!");

    try {
      const res = await fetch(`${API_URL}/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formMenu, pin: adminPin })
      });
      const data = await res.json();
      if (data.success) {
        alert("Menu berhasil ditambahkan!");
        setFormMenu({ nama_menu: '', kategori: 'karbo', kalori: '', foto_url: '' });
        fetchMenus();
      } else {
        alert(data.message);
      }
    } catch (err) { alert("Gagal koneksi ke server"); }
  };

  // Hapus Menu (Admin)
  const deleteMenu = async (id) => {
    if (!adminPin) return alert("Masukkan PIN Admin!");
    if (!confirm("Yakin hapus menu ini?")) return;

    try {
      const res = await fetch(`${API_URL}/menus/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin })
      });
      const data = await res.json();
      if (data.success) {
        fetchMenus();
      } else {
        alert(data.message);
      }
    } catch (err) { alert("Gagal menghapus menu"); }
  };

  // Kirim Pesan
  const submitPesan = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/pesan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPesan)
      });
      const data = await res.json();
      if (data.success) {
        setFormPesan({ pengirim: '', peran: 'Murid', pesan: '' });
        fetchPesan();
      }
    } catch (err) { console.error(err); }
  };

  // Filter menu berdasarkan kategori dari database
  const getMenuByKategori = (kat) => menuList.filter(m => m.kategori === kat);

  return (
    <div className="min-h-screen p-4 md:p-8 text-gray-800 font-sans">
      
      {/* HEADER & SWITCH MODE */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Dapur MBG Jatibaru 007 🍱</h1>
          <p className="text-gray-600">Sistem Kalkulator Gizi & Kelola Menu Harian</p>
        </div>
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className={`mt-4 md:mt-0 px-4 py-2 rounded-xl font-bold transition ${isAdmin ? 'bg-orange-500 text-white' : 'bg-gray-800 text-white'}`}
        >
          {isAdmin ? '← Mode Siswa / Publik' : '🔑 Mode Admin Dapur'}
        </button>
      </header>

      {/* ================= PANEL ADMIN ================= */}
      {isAdmin ? (
        <div className="space-y-8">
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Panel Kontrol Admin Dapur</h2>
            <div className="flex items-center gap-2 max-w-xs">
              <label className="text-sm font-semibold">PIN Admin:</label>
              <input 
                type="password" 
                placeholder="Default: 123456" 
                className="p-2 border rounded-lg flex-1"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
              />
            </div>
          </div>

          {/* FORM TAMBAH MENU */}
          <section className="bg-white p-6 rounded-2xl shadow-lg border">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">➕ Tambah Menu Hari Ini</h2>
            <form onSubmit={submitMenu} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nama Makanan</label>
                <input 
                  type="text" placeholder="Contoh: Rendang Sapi" required className="w-full p-2 border rounded-lg"
                  value={formMenu.nama_menu} onChange={(e) => setFormMenu({...formMenu, nama_menu: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Kategori Menu</label>
                <select 
                  className="w-full p-2 border rounded-lg capitalize"
                  value={formMenu.kategori} onChange={(e) => setFormMenu({...formMenu, kategori: e.target.value})}
                >
                  <option value="karbo">Karbohidrat (Nasi/Kentang)</option>
                  <option value="hewani">Lauk Hewani (Daging/Ayam/Ikan)</option>
                  <option value="nabati">Lauk Nabati (Tempe/Tahu)</option>
                  <option value="sayur">Sayuran (Pakcoy/Buncis)</option>
                  <option value="buah">Buah-buahan (Pisang/Semangka)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Estimasi Kalori (kkal)</label>
                <input 
                  type="number" placeholder="Contoh: 195" required className="w-full p-2 border rounded-lg"
                  value={formMenu.kalori} onChange={(e) => setFormMenu({...formMenu, kalori: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Upload Foto Menu</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-1 border rounded-lg" />
              </div>

              {formMenu.foto_url && (
                <div className="md:col-span-2 flex items-center gap-4">
                  <span className="text-sm font-semibold">Preview:</span>
                  <img src={formMenu.foto_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
                </div>
              )}

              <button type="submit" className="md:col-span-2 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition">
                Simpan Menu ke Database 🚀
              </button>
            </form>
          </section>

          {/* LIST MENU DATABASE */}
          <section className="bg-white p-6 rounded-2xl shadow-lg border">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">📋 Daftar Menu Terdaftar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {menuList.map((item) => (
                <div key={item.id} className="border rounded-xl p-3 bg-gray-50 flex flex-col justify-between">
                  <div>
                    {item.foto_url ? (
                      <img src={item.foto_url} alt={item.nama_menu} className="w-full h-32 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center text-gray-400">Tanpa Foto</div>
                    )}
                    <div className="text-xs font-bold uppercase tracking-wider text-green-700">{item.kategori}</div>
                    <div className="font-bold text-gray-800">{item.nama_menu}</div>
                    <div className="text-sm text-gray-600">{item.kalori} kkal</div>
                  </div>
                  <button 
                    onClick={() => deleteMenu(item.id)}
                    className="mt-3 w-full bg-red-500 text-white text-xs py-1.5 rounded-lg hover:bg-red-600 transition"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        
        /* ================= PANEL PUBLIK (SISWA / GURU) ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KALKULATOR 5 SLOT OMPRENG */}
          <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">🍱 Hitung Kalori 1 Ompreng Hari Ini</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {['karbo', 'hewani', 'nabati', 'sayur', 'buah'].map((kat) => (
                <div key={kat} className="p-3 border rounded-xl bg-gray-50">
                  <label className="block text-sm font-bold capitalize text-gray-700 mb-2">Slot {kat}</label>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    onChange={(e) => {
                      const selected = menuList.find(m => m.id === parseInt(e.target.value));
                      setOmpreng({ ...ompreng, [kat]: selected || null });
                    }}
                  >
                    <option value="">-- Pilih {kat} --</option>
                    {getMenuByKategori(kat).map((m) => (
                      <option key={m.id} value={m.id}>{m.nama_menu} ({m.kalori} kkal)</option>
                    ))}
                  </select>

                  {/* Tampilan gambar jika menu dipilih */}
                  {ompreng[kat] && ompreng[kat].foto_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={ompreng[kat].foto_url} className="w-12 h-12 object-cover rounded-lg border" />
                      <span className="text-xs text-gray-600">{ompreng[kat].nama_menu}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={`p-6 rounded-2xl text-center font-bold transition ${hasilKalori.total_kalori >= 600 ? 'bg-green-100 text-green-900 border border-green-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
              <div className="text-4xl mb-1">{hasilKalori.total_kalori} <span className="text-lg">kkal</span></div>
              <div className="text-lg">{hasilKalori.status}</div>
              <div className="text-xs font-normal text-gray-600 mt-1">Standar Minimal Kebutuhan Makan Siang Sekolah: 600 kkal</div>
            </div>
          </section>

          {/* BUKU TAMU / PESAN MASUKAN */}
          <section className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">💬 Kirim Masukan</h2>
              <form onSubmit={submitPesan} className="space-y-3">
                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="Nama" required className="flex-1 p-2 border rounded-lg text-sm"
                    value={formPesan.pengirim} onChange={(e) => setFormPesan({...formPesan, pengirim: e.target.value})}
                  />
                  <select 
                    className="p-2 border rounded-lg text-sm"
                    value={formPesan.peran} onChange={(e) => setFormPesan({...formPesan, peran: e.target.value})}
                  >
                    <option value="Murid">Murid</option>
                    <option value="Guru">Guru</option>
                  </select>
                </div>
                <textarea 
                  placeholder="Kritik/saran makanan hari ini..." required rows="3" className="w-full p-2 border rounded-lg text-sm"
                  value={formPesan.pesan} onChange={(e) => setFormPesan({...formPesan, pesan: e.target.value})}
                />
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                  Kirim Feedback 🚀
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border max-h-80 overflow-y-auto">
              <h2 className="text-lg font-bold mb-3 border-b pb-2">Pesan Terbaru</h2>
              {pesanList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center">Belum ada pesan.</p>
              ) : (
                <div className="space-y-3">
                  {pesanList.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded-xl border text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-800">{p.pengirim} <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-normal">{p.peran}</span></span>
                      </div>
                      <p className="text-gray-600 text-xs">{p.pesan}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}