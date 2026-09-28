const loginAdmin = (pool) => async (req, res) => {
  const { pin, password } = req.body;
  const credential = pin || password;
  try {
    const result = await pool.query('SELECT * FROM users WHERE password = $1', [credential]);
    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Login Berhasil', data: result.rows[0] });
    } else {
      res.status(403).json({ success: false, message: 'PIN Admin Salah!' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal login.' });
  }
};

const verifyAdminPin = (pool) => async (pin) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE password = $1', [pin]);
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
};

module.exports = { loginAdmin, verifyAdminPin };