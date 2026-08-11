const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth, authorize } = require('../../middleware/auth');

router.use(auth);

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let where = "WHERE b.status != 'cancelled'";
    const params = [];
    if (start_date) { where += ' AND b.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND b.created_at <= ?'; params.push(end_date + ' 23:59:59'); }

    const [results] = await pool.query(
      `SELECT DATE(b.created_at) AS date, COUNT(*) AS bookings,
              COALESCE(SUM(b.total_amount), 0) AS total_value,
              COALESCE(SUM(b.paid_amount), 0) AS amount_received,
              COALESCE(SUM(b.balance_amount), 0) AS outstanding
       FROM bookings b ${where}
       GROUP BY DATE(b.created_at)
       ORDER BY date DESC`,
      params
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// GET /api/reports/bookings
router.get('/bookings', async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (start_date) { where += ' AND b.travel_start_date >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND b.travel_end_date <= ?'; params.push(end_date + ' 23:59:59'); }
    if (status) { where += ' AND b.status = ?'; params.push(status); }

    const [results] = await pool.query(
      `SELECT b.status, COUNT(*) AS count, COALESCE(SUM(b.total_amount), 0) AS total_value,
              COALESCE(SUM(b.paid_amount), 0) AS amount_paid
       FROM bookings b ${where}
       GROUP BY b.status`,
      params
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate booking report' });
  }
});

// GET /api/reports/revenue
router.get('/revenue', async (req, res) => {
  try {
    const { year } = req.query;
    const yr = year || new Date().getFullYear();
    const [results] = await pool.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
              COALESCE(SUM(CASE WHEN payment_type != 'refund' THEN amount ELSE 0 END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN payment_type = 'refund' THEN amount ELSE 0 END), 0) AS refunds,
              COUNT(*) AS transactions
       FROM payments
       WHERE YEAR(payment_date) = ?
       GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
       ORDER BY month ASC`,
      [yr]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

// GET /api/reports/expense
router.get('/expense', async (req, res) => {
  try {
    const { year } = req.query;
    const yr = year || new Date().getFullYear();
    const [results] = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM expenses WHERE YEAR(expense_date) = ?
       GROUP BY category ORDER BY total DESC`,
      [yr]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate expense report' });
  }
});

// GET /api/reports/profit-loss
router.get('/profit-loss', async (req, res) => {
  try {
    const { year } = req.query;
    const yr = year || new Date().getFullYear();

    const [results] = await pool.query(
      `SELECT DATE_FORMAT(month, '%Y-%m') AS month, revenue, expenses, (revenue - expenses) AS profit_loss
       FROM (
         SELECT DATE_FORMAT(p.payment_date, '%Y-%m') AS month,
                COALESCE(SUM(CASE WHEN p.payment_type != 'refund' THEN p.amount ELSE -p.amount END), 0) AS revenue,
                COALESCE((SELECT SUM(e.amount) FROM expenses e
                  WHERE DATE_FORMAT(e.expense_date, '%Y-%m') = DATE_FORMAT(p.payment_date, '%Y-%m')), 0) AS expenses
         FROM payments p
         WHERE YEAR(p.payment_date) = ?
         GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
       ) t
       UNION
       SELECT DATE_FORMAT(e.expense_date, '%Y-%m') AS month, 0 AS revenue,
              COALESCE(SUM(e.amount), 0) AS expenses,
              -COALESCE(SUM(e.amount), 0) AS profit_loss
       FROM expenses e
       WHERE YEAR(e.expense_date) = ?
         AND DATE_FORMAT(e.expense_date, '%Y-%m') NOT IN (
           SELECT DISTINCT DATE_FORMAT(payment_date, '%Y-%m') FROM payments WHERE YEAR(payment_date) = ?
         )
       GROUP BY DATE_FORMAT(e.expense_date, '%Y-%m')
       ORDER BY month ASC`,
      [yr, yr, yr]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate P&L report' });
  }
});

// GET /api/reports/outstanding
router.get('/outstanding', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT b.booking_id, b.tour_name, b.total_amount, b.paid_amount, b.balance_amount,
              c.name AS customer_name, c.phone AS customer_phone, b.travel_start_date
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.balance_amount > 0 AND b.status != 'cancelled'
       ORDER BY b.balance_amount DESC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate outstanding report' });
  }
});

// GET /api/reports/lead-conversion
router.get('/lead-conversion', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT lead_source,
              COUNT(*) AS total_leads,
              SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS converted,
              SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost,
              SUM(CASE WHEN status IN ('new','quotation','followup') THEN 1 ELSE 0 END) AS in_progress,
              ROUND(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS conversion_rate
       FROM leads GROUP BY lead_source ORDER BY total_leads DESC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate lead conversion report' });
  }
});

// GET /api/reports/destination-performance
router.get('/destination-performance', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT destination, COUNT(*) AS bookings,
              COALESCE(SUM(total_amount), 0) AS total_value,
              COALESCE(SUM(paid_amount), 0) AS amount_received,
              COALESCE(AVG(total_amount), 0) AS avg_booking_value
       FROM bookings WHERE status != 'cancelled'
       GROUP BY destination ORDER BY bookings DESC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate destination report' });
  }
});

module.exports = router;
