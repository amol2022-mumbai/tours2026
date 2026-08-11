const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    let params = [];

    if (search) {
      where = 'WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM customers c ${where}`, params);
    const [customers] = await pool.query(
      `SELECT c.* FROM customers c ${where} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (customers.length === 0) return res.status(404).json({ error: 'Customer not found' });

    const [bookings] = await pool.query(
      `SELECT b.*, tp.name AS package_name FROM bookings b
       LEFT JOIN tour_packages tp ON b.package_id = tp.id
       WHERE b.customer_id = ? ORDER BY b.created_at DESC`,
      [req.params.id]
    );

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );

    const [documents] = await pool.query(
      'SELECT * FROM documents WHERE customer_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({ ...customers[0], bookings, payments, documents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, id_proof_type, id_proof_number,
            date_of_birth, nationality, emergency_contact_name, emergency_contact_phone, notes, lead_id } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO customers (name, email, phone, address, city, state, country, id_proof_type,
       id_proof_number, date_of_birth, nationality, emergency_contact_name, emergency_contact_phone, notes, lead_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email || null, phone, address || null, city || null, state || null, country || null,
       id_proof_type || null, id_proof_number || null, date_of_birth || null, nationality || null,
       emergency_contact_name || null, emergency_contact_phone || null, notes || null, lead_id || null]
    );

    const [customer] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json(customer[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['name','email','phone','address','city','state','country','id_proof_type',
      'id_proof_number','date_of_birth','nationality','emergency_contact_name','emergency_contact_phone','notes'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
