const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const { type, status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (type) { where.push('type = ?'); params.push(type); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (search) {
      where.push('(name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ? OR city LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s, s, s);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM suppliers ${whereClause}`, params);
    const [suppliers] = await pool.query(
      `SELECT s.*, COALESCE((SELECT SUM(amount) FROM expenses WHERE supplier_id = s.id), 0) AS total_expenses
       FROM suppliers s ${whereClause}
       ORDER BY s.name ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: suppliers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const [suppliers] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (suppliers.length === 0) return res.status(404).json({ error: 'Supplier not found' });

    const [expenses] = await pool.query(
      `SELECT e.*, b.booking_id AS booking_ref FROM expenses e
       LEFT JOIN bookings b ON e.booking_id = b.id
       WHERE e.supplier_id = ? ORDER BY e.expense_date DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({ ...suppliers[0], expenses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    const { name, type, contact_person, email, phone, address, city, country, rates, bank_details, notes } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO suppliers (name, type, contact_person, email, phone, address, city, country, rates, bank_details, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type, contact_person || null, email || null, phone || null, address || null,
       city || null, country || null, rates || null, bank_details || null, notes || null]
    );
    const [supplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
    res.status(201).json(supplier[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['name','type','contact_person','email','phone','address','city','country','rates','bank_details','notes','status'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
