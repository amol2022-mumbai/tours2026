const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { category, booking_id, supplier_id, payment_status, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (req.user.role === 'sales') { where.push('e.created_by = ?'); params.push(req.user.id); }
    if (category) { where.push('e.category = ?'); params.push(category); }
    if (booking_id) { where.push('e.booking_id = ?'); params.push(booking_id); }
    if (supplier_id) { where.push('e.supplier_id = ?'); params.push(supplier_id); }
    if (payment_status) { where.push('e.payment_status = ?'); params.push(payment_status); }
    if (start_date) { where.push('DATE(e.expense_date) >= ?'); params.push(start_date); }
    if (end_date) { where.push('DATE(e.expense_date) <= ?'); params.push(end_date); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM expenses e ${whereClause}`, params);
    const [expenses] = await pool.query(
      `SELECT e.*, s.name AS supplier_name, b.booking_id AS booking_ref, u.name AS created_by_name
       FROM expenses e
       LEFT JOIN suppliers s ON e.supplier_id = s.id
       LEFT JOIN bookings b ON e.booking_id = b.id
       LEFT JOIN users u ON e.created_by = u.id
       ${whereClause}
       ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: expenses,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const [expenses] = await pool.query(
      `SELECT e.*, s.name AS supplier_name, b.booking_id AS booking_ref
       FROM expenses e
       LEFT JOIN suppliers s ON e.supplier_id = s.id
       LEFT JOIN bookings b ON e.booking_id = b.id
       WHERE e.id = ?`, [req.params.id]
    );
    if (expenses.length === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json(expenses[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { booking_id, supplier_id, category, description, amount, expense_date, payment_status, notes } = req.body;
    if (!category || !amount || !expense_date) {
      return res.status(400).json({ error: 'Category, amount, and expense date are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO expenses (booking_id, supplier_id, category, description, amount, expense_date, payment_status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_id || null, supplier_id || null, category, description || null,
       amount, expense_date, payment_status || 'pending', notes || null, req.user.id]
    );

    // Update supplier total_paid if paid
    if (payment_status === 'paid' && supplier_id) {
      await pool.query('UPDATE suppliers SET total_paid = total_paid + ? WHERE id = ?', [amount, supplier_id]);
    }

    const [expense] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
    res.status(201).json(expense[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['booking_id','supplier_id','category','description','amount','expense_date','payment_status','notes'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
