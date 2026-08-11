const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth, authorize } = require('../../middleware/auth');

router.use(auth);

// GET /api/leads - List leads with filters
router.get('/', async (req, res) => {
  try {
    const { status, source, assigned_to, search, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let where = [];
    let params = [];

    // Sales role can only see own leads
    if (req.user.role === 'sales') {
      where.push('l.assigned_to = ?');
      params.push(req.user.id);
    }

    if (status) { where.push('l.status = ?'); params.push(status); }
    if (source) { where.push('l.lead_source = ?'); params.push(source); }
    if (assigned_to) { where.push('l.assigned_to = ?'); params.push(assigned_to); }
    if (search) {
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.destination LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (start_date) { where.push('DATE(l.created_at) >= ?'); params.push(start_date); }
    if (end_date) { where.push('DATE(l.created_at) <= ?'); params.push(end_date); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l ${whereClause}`, params
    );

    const [leads] = await pool.query(
      `SELECT l.*, u.name AS assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       ${whereClause}
       ORDER BY l.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const [leads] = await pool.query(
      `SELECT l.*, u.name AS assigned_to_name
       FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = ?`, [req.params.id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const [followups] = await pool.query(
      `SELECT f.*, u.name AS user_name
       FROM followups f LEFT JOIN users u ON f.user_id = u.id
       WHERE f.lead_id = ? ORDER BY f.followup_date DESC`, [req.params.id]
    );

    const [quotations] = await pool.query(
      `SELECT q.*, u.name AS created_by_name
       FROM quotations q LEFT JOIN users u ON q.created_by = u.id
       WHERE q.lead_id = ? ORDER BY q.created_at DESC`, [req.params.id]
    );

    res.json({ ...leads[0], followups, quotations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, destination, travel_date, travelers, budget, requirements, lead_source, assigned_to, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO leads (name, email, phone, destination, travel_date, travelers, budget, requirements, lead_source, assigned_to, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email || null, phone, destination || null, travel_date || null,
       travelers || 1, budget || null, requirements || null, lead_source || 'other',
       assigned_to || req.user.id, notes || null]
    );

    // Auto-create followup for tomorrow if not set
    await pool.query(
      `INSERT INTO followups (lead_id, user_id, followup_date, notes, status)
       VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Initial follow-up for new lead', 'pending')`,
      [result.insertId, assigned_to || req.user.id]
    );

    const [newLead] = await pool.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    res.status(201).json(newLead[0]);
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, destination, travel_date, travelers, budget, requirements, lead_source, status, assigned_to, notes } = req.body;
    
    const updates = [];
    const values = [];
    const fields = { name, email, phone, destination, travel_date, travelers, budget, requirements, lead_source, status, assigned_to, notes };
    
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    await pool.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // If lead is confirmed, auto-create customer
    if (status === 'confirmed') {
      const [existingCust] = await pool.query('SELECT id FROM customers WHERE lead_id = ?', [req.params.id]);
      if (existingCust.length === 0) {
        await pool.query(
          'INSERT INTO customers (lead_id, name, email, phone) VALUES (?, ?, ?, ?)',
          [req.params.id, updated[0].name, updated[0].email, updated[0].phone]
        );
      }
    }

    res.json(updated[0]);
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET /api/leads/:id/followups
router.get('/:id/followups', async (req, res) => {
  try {
    const [followups] = await pool.query(
      `SELECT f.*, u.name AS user_name FROM followups f
       LEFT JOIN users u ON f.user_id = u.id
       WHERE f.lead_id = ? ORDER BY f.followup_date ASC, f.followup_time ASC`,
      [req.params.id]
    );
    res.json(followups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch followups' });
  }
});

// POST /api/leads/:id/followups
router.post('/:id/followups', async (req, res) => {
  try {
    const { followup_date, followup_time, notes } = req.body;
    if (!followup_date) {
      return res.status(400).json({ error: 'Follow-up date is required' });
    }
    const [result] = await pool.query(
      'INSERT INTO followups (lead_id, user_id, followup_date, followup_time, notes) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, followup_date, followup_time || null, notes || null]
    );
    const [followup] = await pool.query('SELECT * FROM followups WHERE id = ?', [result.insertId]);
    res.status(201).json(followup[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create followup' });
  }
});

// PUT /api/leads/followups/:fid
router.put('/followups/:fid', async (req, res) => {
  try {
    const { status, notes, followup_date, followup_time } = req.body;
    const updates = [];
    const values = [];
    if (status) { updates.push('status = ?'); values.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (followup_date) { updates.push('followup_date = ?'); values.push(followup_date); }
    if (followup_time !== undefined) { updates.push('followup_time = ?'); values.push(followup_time); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.fid);
    await pool.query(`UPDATE followups SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM followups WHERE id = ?', [req.params.fid]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update followup' });
  }
});

module.exports = router;
