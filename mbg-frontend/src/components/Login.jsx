import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLoginSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Pastikan URL backend sesuai (misal: port 3001)
      const response = await axios.post('http://localhost:3001/api/admin/login', {
        password: pin // Kita kirim sebagai password sesuai dengan backend terbaru
      });

      if (response.data.success) {
        // Simpan status login di LocalStorage
        localStorage.setItem('isAdminLoggedIn', 'true');
        // Panggil fungsi sukses dari props
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal! Server bermasalah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
      <h2 style={{ color: '#2d3748', marginBottom: '10px' }}>Login Admin Dapur</h2>
      <p style={{ color: '#718096', marginBottom: '25px', fontSize: '14px' }}>Masukkan PIN Admin untuk mengelola menu harian.</p>
      
      <form onSubmit={handleLogin}>
        <input
          type="password"
          placeholder="Masukkan PIN Admin..."
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
          style={{ 
            width: '100%', 
            padding: '12px', 
            marginBottom: '15px', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            boxSizing: 'border-box'
          }}
        />
        
        {error && <p style={{ color: '#e53e3e', fontSize: '14px', marginBottom: '15px' }}>{error}</p>}
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isLoading ? 'Mengecek...' : 'Masuk Panel Admin 🚀'}
        </button>
      </form>
    </div>
  );
}