const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

// GET /api/itinerary/package/:packageId
router.get('/package/:packageId', async (req, res) => {
  try {
    const [days] = await pool.query(
      'SELECT * FROM itinerary_days WHERE package_id = ? ORDER BY day_number ASC',
      [req.params.packageId]
    );
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch itinerary' });
  }
});

// POST /api/itinerary/package/:packageId
router.post('/package/:packageId', async (req, res) => {
  try {
    const { day_number, title, description, places_to_visit, activities,
            hotel_name, hotel_details, transport_name, transport_details, meals } = req.body;
    if (!day_number) {
      return res.status(400).json({ error: 'Day number is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO itinerary_days (package_id, day_number, title, description, places_to_visit,
       activities, hotel_name, hotel_details, transport_name, transport_details, meals)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.packageId, day_number, title || null, description || null,
       places_to_visit || null, activities || null, hotel_name || null,
       hotel_details || null, transport_name || null, transport_details || null, meals || null]
    );

    const [day] = await pool.query('SELECT * FROM itinerary_days WHERE id = ?', [result.insertId]);
    res.status(201).json(day[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create itinerary day' });
  }
});

// PUT /api/itinerary/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['day_number','title','description','places_to_visit','activities',
      'hotel_name','hotel_details','transport_name','transport_details','meals'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE itinerary_days SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM itinerary_days WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Itinerary day not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update itinerary day' });
  }
});

// DELETE /api/itinerary/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM itinerary_days WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Itinerary day not found' });
    res.json({ message: 'Itinerary day deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete itinerary day' });
  }
});

// POST /api/itinerary/bulk/:packageId - Bulk create itinerary
router.post('/bulk/:packageId', async (req, res) => {
  try {
    const { days } = req.body;
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: 'Days array is required' });
    }

    // Delete existing itinerary
    await pool.query('DELETE FROM itinerary_days WHERE package_id = ?', [req.params.packageId]);

    for (const day of days) {
      await pool.query(
        `INSERT INTO itinerary_days (package_id, day_number, title, description, places_to_visit,
         activities, hotel_name, hotel_details, transport_name, transport_details, meals)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.packageId, day.day_number, day.title || null, day.description || null,
         day.places_to_visit || null, day.activities || null, day.hotel_name || null,
         day.hotel_details || null, day.transport_name || null, day.transport_details || null, day.meals || null]
      );
    }

    const [updated] = await pool.query(
      'SELECT * FROM itinerary_days WHERE package_id = ? ORDER BY day_number ASC',
      [req.params.packageId]
    );
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create itinerary' });
  }
});

module.exports = router;
