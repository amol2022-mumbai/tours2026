const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth, authorize } = require('../../middleware/auth');

router.use(auth);

// GET /api/marketing/leads
router.get('/leads', async (req, res) => {
  try {
    const { source, campaign_name, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    const params = [];

    if (source) { where.push('source = ?'); params.push(source); }
    if (campaign_name) { where.push('campaign_name LIKE ?'); params.push(`%${campaign_name}%`); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM marketing_leads ${whereClause}`, params);
    const [leads] = await pool.query(
      `SELECT ml.*, l.name AS converted_lead_name FROM marketing_leads ml
       LEFT JOIN leads l ON ml.converted_to_lead = l.id
       ${whereClause}
       ORDER BY ml.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: leads,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch marketing leads' });
  }
});

// POST /api/marketing/leads
router.post('/leads', async (req, res) => {
  try {
    const { source, campaign_name, lead_name, lead_phone, lead_email, ad_spend, impressions, clicks, notes } = req.body;
    if (!source) return res.status(400).json({ error: 'Source is required' });

    const [result] = await pool.query(
      `INSERT INTO marketing_leads (source, campaign_name, lead_name, lead_phone, lead_email, ad_spend, impressions, clicks, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [source, campaign_name || null, lead_name || null, lead_phone || null, lead_email || null,
       ad_spend || 0, impressions || 0, clicks || 0, notes || null]
    );

    const [lead] = await pool.query('SELECT * FROM marketing_leads WHERE id = ?', [result.insertId]);
    res.status(201).json(lead[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create marketing lead' });
  }
});

// PUT /api/marketing/leads/:id
router.put('/leads/:id', async (req, res) => {
  try {
    const fields = ['source','campaign_name','lead_name','lead_phone','lead_email','ad_spend','impressions','clicks','notes','converted_to_lead'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }

    // Auto-set converted_at
    if (req.body.converted_to_lead) {
      updates.push('converted_at = NOW()');
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE marketing_leads SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM marketing_leads WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update marketing lead' });
  }
});

// GET /api/marketing/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT campaign_name, source,
              COUNT(*) AS total_leads,
              COALESCE(SUM(ad_spend), 0) AS total_spend,
              COALESCE(SUM(impressions), 0) AS total_impressions,
              COALESCE(SUM(clicks), 0) AS total_clicks,
              COUNT(converted_to_lead) AS converted
       FROM marketing_leads
       WHERE campaign_name IS NOT NULL
       GROUP BY campaign_name, source
       ORDER BY total_leads DESC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign data' });
  }
});

// GET /api/marketing/stats
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await pool.query(
      `SELECT source,
              COUNT(*) AS total_leads,
              COALESCE(SUM(ad_spend), 0) AS total_spend,
              COUNT(converted_to_lead) AS converted,
              CASE WHEN COUNT(converted_to_lead) > 0
                THEN ROUND(COALESCE(SUM(ad_spend), 0) / COUNT(converted_to_lead), 2)
                ELSE 0 END AS cost_per_lead,
              CASE WHEN COUNT(*) > 0
                THEN ROUND(COUNT(converted_to_lead) / COUNT(*) * 100, 2)
                ELSE 0 END AS conversion_rate
       FROM marketing_leads GROUP BY source`
    );

    // Revenue by campaign
    const [revenue] = await pool.query(
      `SELECT ml.campaign_name, ml.source,
              COUNT(DISTINCT b.id) AS bookings,
              COALESCE(SUM(b.paid_amount), 0) AS revenue
       FROM marketing_leads ml
       LEFT JOIN leads l ON ml.converted_to_lead = l.id
       LEFT JOIN quotations q ON q.lead_id = l.id
       LEFT JOIN bookings b ON b.quotation_id = q.id AND b.status != 'cancelled'
       WHERE ml.converted_to_lead IS NOT NULL
       GROUP BY ml.campaign_name, ml.source
       ORDER BY revenue DESC`
    );

    res.json({ source_stats: stats, revenue_by_campaign: revenue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch marketing stats' });
  }
});

module.exports = router;
