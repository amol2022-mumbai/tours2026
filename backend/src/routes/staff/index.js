const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
const { auth, authorize } = require('../../middleware/auth');

router.use(auth);
router.use(authorize('admin', 'manager'));

// GET /api/staff
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, phone, role, status, avatar, created_at, updated_at FROM users ORDER BY role, name ASC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// GET /api/staff/:id
router.get('/:id', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, status, avatar, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/staff
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, hash, role]
    );

    const [user] = await pool.query(
      'SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(user[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/staff/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, role, status, password } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hash);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [user] = await pool.query(
      'SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (user.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/staff/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }
    await pool.query("UPDATE users SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;
