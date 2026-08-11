const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/quotations
router.get('/', async (req, res) => {
  try {
    const { status, lead_id, customer_id, search, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (req.user.role === 'sales') { where.push('q.created_by = ?'); params.push(req.user.id); }
    if (status) { where.push('q.status = ?'); params.push(status); }
    if (lead_id) { where.push('q.lead_id = ?'); params.push(lead_id); }
    if (customer_id) { where.push('q.customer_id = ?'); params.push(customer_id); }
    if (search) {
      where.push('(q.quotation_number LIKE ? OR q.destination LIKE ?)');
      const s = `%${search}%`; params.push(s, s);
    }
    if (start_date) { where.push('DATE(q.created_at) >= ?'); params.push(start_date); }
    if (end_date) { where.push('DATE(q.created_at) <= ?'); params.push(end_date); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM quotations q ${whereClause}`, params);
    const [quotations] = await pool.query(
      `SELECT q.*, c.name AS customer_name, l.name AS lead_name, tp.name AS package_name, u.name AS created_by_name
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       LEFT JOIN leads l ON q.lead_id = l.id
       LEFT JOIN tour_packages tp ON q.package_id = tp.id
       LEFT JOIN users u ON q.created_by = u.id
       ${whereClause}
       ORDER BY q.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: quotations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
  try {
    const [quotations] = await pool.query(
      `SELECT q.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              l.name AS lead_name, tp.name AS package_name, u.name AS created_by_name
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       LEFT JOIN leads l ON q.lead_id = l.id
       LEFT JOIN tour_packages tp ON q.package_id = tp.id
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.id = ?`, [req.params.id]
    );
    if (quotations.length === 0) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotations[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

// POST /api/quotations
router.post('/', async (req, res) => {
  try {
    const { lead_id, customer_id, package_id, destination, travel_date, travelers, duration_days,
            subtotal, discount_percent, discount_amount, tax_percent, tax_amount, inclusions,
            exclusions, terms_conditions, validity_days } = req.body;

    const total = (subtotal || 0) - (discount_amount || 0) + (tax_amount || 0);

    // Generate quotation number: QT-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [[{ seq }]] = await pool.query(
      "SELECT COUNT(*) + 1 AS seq FROM quotations WHERE quotation_number LIKE ?",
      [`QT-${dateStr}-%`]
    );
    const quotation_number = `QT-${dateStr}-${String(seq).padStart(4, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO quotations (quotation_number, lead_id, customer_id, package_id, destination,
       travel_date, travelers, duration_days, subtotal, discount_percent, discount_amount,
       tax_percent, tax_amount, total, inclusions, exclusions, terms_conditions, validity_days, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quotation_number, lead_id || null, customer_id || null, package_id || null,
       destination || null, travel_date || null, travelers || 1, duration_days || null,
       subtotal || 0, discount_percent || 0, discount_amount || 0,
       tax_percent || 0, tax_amount || 0, total, inclusions || null,
       exclusions || null, terms_conditions || null, validity_days || 15, req.user.id]
    );

    // Update lead status to 'quotation'
    if (lead_id) {
      await pool.query("UPDATE leads SET status = 'quotation' WHERE id = ?", [lead_id]);
    }

    const [quotation] = await pool.query('SELECT * FROM quotations WHERE id = ?', [result.insertId]);
    res.status(201).json(quotation[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

// PUT /api/quotations/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['lead_id','customer_id','package_id','destination','travel_date','travelers',
      'duration_days','subtotal','discount_percent','discount_amount','tax_percent','tax_amount',
      'inclusions','exclusions','terms_conditions','validity_days'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }

    // Recalculate total if pricing fields changed
    const subtotal = req.body.subtotal;
    const discount = req.body.discount_amount;
    const tax = req.body.tax_amount;
    if (subtotal !== undefined || discount !== undefined || tax !== undefined) {
      const [current] = await pool.query('SELECT subtotal, discount_amount, tax_amount FROM quotations WHERE id = ?', [req.params.id]);
      if (current.length > 0) {
        const s = subtotal !== undefined ? subtotal : current[0].subtotal;
        const d = discount !== undefined ? discount : current[0].discount_amount;
        const t = tax !== undefined ? tax : current[0].tax_amount;
        updates.push('total = ?');
        values.push(s - d + t);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Quotation not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

// PUT /api/quotations/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft','sent','accepted','rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query('UPDATE quotations SET status = ? WHERE id = ?', [status, req.params.id]);

    if (status === 'accepted') {
      const [qt] = await pool.query('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
      if (qt.length > 0 && qt[0].lead_id) {
        await pool.query("UPDATE leads SET status = 'confirmed' WHERE id = ?", [qt[0].lead_id]);
      }
    }

    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM quotations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Quotation not found' });
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

module.exports = router;
