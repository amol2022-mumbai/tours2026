const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/tours
router.get('/', async (req, res) => {
  try {
    const { destination, status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (destination) { where.push('destination LIKE ?'); params.push(`%${destination}%`); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (search) {
      where.push('(name LIKE ? OR destination LIKE ? OR description LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tour_packages ${whereClause}`, params);
    const [tours] = await pool.query(
      `SELECT tp.*,
        (SELECT COUNT(*) FROM bookings WHERE package_id = tp.id) AS booking_count
       FROM tour_packages tp ${whereClause}
       ORDER BY tp.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: tours,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tour packages' });
  }
});

// GET /api/tours/:id
router.get('/:id', async (req, res) => {
  try {
    const [tours] = await pool.query('SELECT * FROM tour_packages WHERE id = ?', [req.params.id]);
    if (tours.length === 0) return res.status(404).json({ error: 'Tour package not found' });

    const [itinerary] = await pool.query(
      'SELECT * FROM itinerary_days WHERE package_id = ? ORDER BY day_number ASC',
      [req.params.id]
    );

    const [transport] = await pool.query(
      'SELECT * FROM tour_transport WHERE package_id = ?', [req.params.id]
    );

    const [hotels] = await pool.query(
      `SELECT th.*, s.name AS supplier_name FROM tour_hotels th
       LEFT JOIN suppliers s ON th.supplier_id = s.id
       WHERE th.package_id = ? ORDER BY th.check_in ASC`,
      [req.params.id]
    );

    const [bookings] = await pool.query(
      `SELECT b.booking_id, b.travel_start_date, b.status, c.name AS customer_name
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.package_id = ? ORDER BY b.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ ...tours[0], itinerary, transport, hotels, recentBookings: bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tour package' });
  }
});

// POST /api/tours
router.post('/', async (req, res) => {
  try {
    const { name, destination, country, duration_days, duration_nights, description, highlights,
            inclusions, exclusions, terms_conditions, cost, selling_price, image_url } = req.body;
    if (!name || !destination) {
      return res.status(400).json({ error: 'Name and destination are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO tour_packages (name, destination, country, duration_days, duration_nights,
       description, highlights, inclusions, exclusions, terms_conditions, cost, selling_price, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, destination, country || null, duration_days || 1, duration_nights || 0,
       description || null, highlights || null, inclusions || null, exclusions || null,
       terms_conditions || null, cost || 0, selling_price || 0, image_url || null]
    );

    const [tour] = await pool.query('SELECT * FROM tour_packages WHERE id = ?', [result.insertId]);
    res.status(201).json(tour[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tour package' });
  }
});

// PUT /api/tours/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['name','destination','country','duration_days','duration_nights','description',
      'highlights','inclusions','exclusions','terms_conditions','cost','selling_price','image_url','status'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE tour_packages SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM tour_packages WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Tour package not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tour package' });
  }
});

// DELETE /api/tours/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM tour_packages WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tour package not found' });
    res.json({ message: 'Tour package deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tour package' });
  }
});

module.exports = router;
