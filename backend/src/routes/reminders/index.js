const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/reminders
router.get('/', async (req, res) => {
  try {
    const { reminder_type, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    const params = [];

    where.push('r.user_id = ?'); params.push(req.user.id);
    if (reminder_type) { where.push('r.reminder_type = ?'); params.push(reminder_type); }
    if (status) { where.push('r.status = ?'); params.push(status); }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM reminders r ${whereClause}`, params);
    const [reminders] = await pool.query(
      `SELECT r.* FROM reminders r ${whereClause}
       ORDER BY r.reminder_date ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: reminders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/pending
router.get('/pending', async (req, res) => {
  try {
    const [reminders] = await pool.query(
      `SELECT r.* FROM reminders r
       WHERE r.user_id = ? AND r.status = 'pending' AND r.reminder_date <= NOW()
       ORDER BY r.reminder_date ASC`,
      [req.user.id]
    );
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending reminders' });
  }
});

// POST /api/reminders
router.post('/', async (req, res) => {
  try {
    const { reminder_type, reference_type, reference_id, reminder_date, message } = req.body;
    if (!reminder_type || !reference_type || !reference_id || !reminder_date) {
      return res.status(400).json({ error: 'Reminder type, reference, and date are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO reminders (user_id, reminder_type, reference_type, reference_id, reminder_date, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, reminder_type, reference_type, reference_id, reminder_date, message || null]
    );

    const [reminder] = await pool.query('SELECT * FROM reminders WHERE id = ?', [result.insertId]);
    res.status(201).json(reminder[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PUT /api/reminders/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['reminder_date','message','reminder_type'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, [...values, req.user.id]);
    const [updated] = await pool.query('SELECT * FROM reminders WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// PUT /api/reminders/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending','sent','done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE reminders SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.user.id]);
    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
