const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/bookings
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, search, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (req.user.role === 'sales') { where.push('b.created_by = ?'); params.push(req.user.id); }
    if (status) { where.push('b.status = ?'); params.push(status); }
    if (customer_id) { where.push('b.customer_id = ?'); params.push(customer_id); }
    if (search) {
      where.push('(b.booking_id LIKE ? OR b.tour_name LIKE ? OR b.destination LIKE ? OR c.name LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s, s);
    }
    if (start_date) { where.push('DATE(b.travel_start_date) >= ?'); params.push(start_date); }
    if (end_date) { where.push('DATE(b.travel_end_date) <= ?'); params.push(end_date); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id ${whereClause}`, params
    );
    const [bookings] = await pool.query(
      `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, tp.name AS package_name, u.name AS created_by_name
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       LEFT JOIN tour_packages tp ON b.package_id = tp.id
       LEFT JOIN users u ON b.created_by = u.id
       ${whereClause}
       ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
  try {
    // Try by numeric ID first, then by booking_id string
    const isNumeric = /^\d+$/.test(req.params.id);
    const whereClause = isNumeric ? 'b.id = ?' : 'b.booking_id = ?';

    const [bookings] = await pool.query(
      `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              c.address AS customer_address, tp.name AS package_name, u.name AS created_by_name
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       LEFT JOIN tour_packages tp ON b.package_id = tp.id
       LEFT JOIN users u ON b.created_by = u.id
       WHERE ${whereClause}`, [req.params.id]
    );
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC',
      [bookings[0].id]
    );

    res.json({ ...bookings[0], payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// POST /api/bookings
router.post('/', async (req, res) => {
  try {
    const { quotation_id, customer_id, package_id, tour_name, destination,
            travel_start_date, travel_end_date, travelers, adult_count, child_count, infant_count,
            total_amount, advance_amount, special_requests } = req.body;
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }

    const total = total_amount || 0;
    const advance = advance_amount || 0;
    const balance = total - advance;

    // Generate booking ID: BK-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [[{ seq }]] = await pool.query(
      "SELECT COUNT(*) + 1 AS seq FROM bookings WHERE booking_id LIKE ?",
      [`BK-${dateStr}-%`]
    );
    const booking_id = `BK-${dateStr}-${String(seq).padStart(4, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO bookings (booking_id, quotation_id, customer_id, package_id, tour_name, destination,
       travel_start_date, travel_end_date, travelers, adult_count, child_count, infant_count,
       total_amount, advance_amount, balance_amount, paid_amount, special_requests, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_id, quotation_id || null, customer_id, package_id || null, tour_name || null,
       destination || null, travel_start_date || null, travel_end_date || null,
       travelers || 1, adult_count || 1, child_count || 0, infant_count || 0,
       total, advance, balance, 0, special_requests || null, req.user.id]
    );

    // Update customer booking count
    await pool.query(
      'UPDATE customers SET total_bookings = total_bookings + 1 WHERE id = ?', [customer_id]
    );

    // If advance > 0, auto-create advance payment
    if (advance > 0) {
      const [[{ pseq }]] = await pool.query(
        "SELECT COUNT(*) + 1 AS pseq FROM payments WHERE receipt_number LIKE ?",
        [`RCP-${dateStr}-%`]
      );
      const receipt = `RCP-${dateStr}-${String(pseq).padStart(4, '0')}`;
      await pool.query(
        `INSERT INTO payments (booking_id, customer_id, amount, payment_type, payment_method, payment_date, receipt_number, notes, created_by)
         VALUES (?, ?, ?, 'advance', 'bank_transfer', CURDATE(), ?, 'Advance payment at booking', ?)`,
        [result.insertId, customer_id, advance, receipt, req.user.id]
      );
      await pool.query('UPDATE bookings SET paid_amount = ? WHERE id = ?', [advance, result.insertId]);
      await pool.query(
        'UPDATE customers SET total_spent = total_spent + ?, outstanding_amount = outstanding_amount + ? WHERE id = ?',
        [advance, balance, customer_id]
      );
    }

    // If from quotation, mark quotation as accepted
    if (quotation_id) {
      await pool.query("UPDATE quotations SET status = 'accepted' WHERE id = ?", [quotation_id]);
    }

    const [booking] = await pool.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    res.status(201).json(booking[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PUT /api/bookings/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['quotation_id','customer_id','package_id','tour_name','destination',
      'travel_start_date','travel_end_date','travelers','adult_count','child_count','infant_count',
      'total_amount','advance_amount','special_requests'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }

    // Recalculate balance
    if (req.body.total_amount !== undefined || req.body.advance_amount !== undefined) {
      const [curr] = await pool.query('SELECT total_amount, advance_amount, paid_amount FROM bookings WHERE id = ?', [req.params.id]);
      if (curr.length > 0) {
        const t = req.body.total_amount !== undefined ? req.body.total_amount : curr[0].total_amount;
        const a = req.body.advance_amount !== undefined ? req.body.advance_amount : curr[0].advance_amount;
        updates.push('balance_amount = ?');
        values.push(t - a - curr[0].paid_amount);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// PUT /api/bookings/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending','confirmed','cancelled','completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);

    // Auto-create reminder for travel if confirmed
    if (status === 'confirmed') {
      const [b] = await pool.query('SELECT travel_start_date, customer_id, created_by FROM bookings WHERE id = ?', [req.params.id]);
      if (b.length > 0 && b[0].travel_start_date) {
        // Reminder 3 days before travel
        const reminderDate = new Date(b[0].travel_start_date);
        reminderDate.setDate(reminderDate.getDate() - 3);
        await pool.query(
          `INSERT INTO reminders (user_id, reminder_type, reference_type, reference_id, reminder_date, message)
           VALUES (?, 'travel', 'booking', ?, ?, ?)`,
          [b[0].created_by, req.params.id, reminderDate.toISOString().slice(0, 10), 'Upcoming travel reminder']
        );
      }
    }

    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

module.exports = router;
