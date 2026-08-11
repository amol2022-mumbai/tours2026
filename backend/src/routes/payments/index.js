const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { booking_id, customer_id, payment_type, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (req.user.role === 'sales') { where.push('p.created_by = ?'); params.push(req.user.id); }
    if (booking_id) { where.push('p.booking_id = ?'); params.push(booking_id); }
    if (customer_id) { where.push('p.customer_id = ?'); params.push(customer_id); }
    if (payment_type) { where.push('p.payment_type = ?'); params.push(payment_type); }
    if (start_date) { where.push('DATE(p.payment_date) >= ?'); params.push(start_date); }
    if (end_date) { where.push('DATE(p.payment_date) <= ?'); params.push(end_date); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM payments p ${whereClause}`, params);
    const [payments] = await pool.query(
      `SELECT p.*, b.booking_id AS booking_ref, c.name AS customer_name, u.name AS created_by_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN users u ON p.created_by = u.id
       ${whereClause}
       ORDER BY p.payment_date DESC, p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: payments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT p.*, b.booking_id AS booking_ref, c.name AS customer_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.id = ?`, [req.params.id]
    );
    if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(payments[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const { booking_id, customer_id, amount, payment_type, payment_method, payment_date, transaction_id, notes } = req.body;
    if (!amount || !payment_date) {
      return res.status(400).json({ error: 'Amount and payment date are required' });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [[{ seq }]] = await pool.query(
      "SELECT COUNT(*) + 1 AS seq FROM payments WHERE receipt_number LIKE ?",
      [`RCP-${dateStr}-%`]
    );
    const receipt_number = `RCP-${dateStr}-${String(seq).padStart(4, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO payments (booking_id, customer_id, amount, payment_type, payment_method,
       payment_date, transaction_id, receipt_number, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_id || null, customer_id || null, amount, payment_type || 'advance',
       payment_method || 'bank_transfer', payment_date, transaction_id || null,
       receipt_number, notes || null, req.user.id]
    );

    // Update booking paid_amount and balance
    if (booking_id && payment_type !== 'refund') {
      await pool.query(
        'UPDATE bookings SET paid_amount = paid_amount + ?, balance_amount = balance_amount - ? WHERE id = ?',
        [amount, amount, booking_id]
      );
      // Auto-confirm booking if balance is zero
      const [b] = await pool.query('SELECT balance_amount FROM bookings WHERE id = ?', [booking_id]);
      if (b.length > 0 && b[0].balance_amount <= 0) {
        await pool.query("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND balance_amount <= 0", [booking_id]);
      }
    }

    // Update customer financials
    if (customer_id) {
      if (payment_type === 'refund') {
        await pool.query('UPDATE customers SET outstanding_amount = outstanding_amount - ? WHERE id = ?', [amount, customer_id]);
      } else {
        await pool.query('UPDATE customers SET total_spent = total_spent + ?, outstanding_amount = outstanding_amount - ? WHERE id = ?', [amount, amount, customer_id]);
      }
    }

    const [payment] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    res.status(201).json(payment[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['amount','payment_type','payment_method','payment_date','transaction_id','notes'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    // Reverse booking balance before deleting
    const [payment] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (payment.length > 0 && payment[0].booking_id) {
      if (payment[0].payment_type !== 'refund') {
        await pool.query(
          'UPDATE bookings SET paid_amount = paid_amount - ?, balance_amount = balance_amount + ? WHERE id = ?',
          [payment[0].amount, payment[0].amount, payment[0].booking_id]
        );
      }
    }
    const [result] = await pool.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
