const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth, authorize } = require('../../middleware/auth');

router.use(auth);

// GET /api/profitability/tour-wise
router.get('/tour-wise', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let whereClause = "WHERE b.status != 'cancelled'";
    let expWhere = '';
    const params = [];

    if (start_date) { whereClause += ' AND b.travel_start_date >= ?'; params.push(start_date); }
    if (end_date) { whereClause += ' AND b.travel_end_date <= ?'; params.push(end_date); }

    const [results] = await pool.query(
      `SELECT b.package_id, COALESCE(tp.name, b.tour_name) AS tour_name, b.destination,
              COUNT(b.id) AS booking_count,
              COALESCE(SUM(b.paid_amount), 0) AS total_revenue,
              COALESCE(SUM(b.total_amount), 0) AS total_booking_value,
              COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.booking_id IN
                (SELECT id FROM bookings b2 WHERE b2.package_id = b.package_id ${whereClause.replace(/b\./g, 'b2.')})
              ), 0) AS total_expenses
       FROM bookings b
       LEFT JOIN tour_packages tp ON b.package_id = tp.id
       ${whereClause}
       GROUP BY b.package_id, tp.name, b.tour_name, b.destination
       ORDER BY total_revenue DESC`,
      params
    );

    const enriched = results.map(r => ({
      ...r,
      gross_profit: parseFloat(r.total_revenue) - parseFloat(r.total_expenses),
      profit_margin: parseFloat(r.total_revenue) > 0
        ? ((parseFloat(r.total_revenue) - parseFloat(r.total_expenses)) / parseFloat(r.total_revenue) * 100).toFixed(2)
        : 0
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tour-wise profitability' });
  }
});

// GET /api/profitability/customer-wise
router.get('/customer-wise', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT c.id AS customer_id, c.name AS customer_name, c.phone,
              COUNT(b.id) AS booking_count,
              COALESCE(SUM(b.paid_amount), 0) AS total_revenue,
              COALESCE((SELECT SUM(e.amount) FROM expenses e
                JOIN bookings b2 ON e.booking_id = b2.id WHERE b2.customer_id = c.id), 0) AS total_expenses
       FROM customers c
       LEFT JOIN bookings b ON c.id = b.customer_id AND b.status != 'cancelled'
       GROUP BY c.id, c.name, c.phone
       HAVING booking_count > 0
       ORDER BY total_revenue DESC`
    );

    const enriched = results.map(r => ({
      ...r,
      gross_profit: parseFloat(r.total_revenue) - parseFloat(r.total_expenses),
      profit_margin: parseFloat(r.total_revenue) > 0
        ? ((parseFloat(r.total_revenue) - parseFloat(r.total_expenses)) / parseFloat(r.total_revenue) * 100).toFixed(2)
        : 0
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer-wise profitability' });
  }
});

// GET /api/profitability/destination-wise
router.get('/destination-wise', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT COALESCE(b.destination, tp.destination) AS destination,
              COUNT(b.id) AS booking_count,
              COALESCE(SUM(b.paid_amount), 0) AS total_revenue,
              COALESCE(SUM(b.total_amount), 0) AS booking_value
       FROM bookings b
       LEFT JOIN tour_packages tp ON b.package_id = tp.id
       WHERE b.status != 'cancelled'
       GROUP BY COALESCE(b.destination, tp.destination)
       ORDER BY total_revenue DESC`
    );

    // Get expenses per destination
    for (const r of results) {
      const [[{ exp }]] = await pool.query(
        `SELECT COALESCE(SUM(e.amount), 0) AS exp FROM expenses e
         JOIN bookings b2 ON e.booking_id = b2.id
         WHERE COALESCE(b2.destination, '') = ? AND b2.status != 'cancelled'`,
        [r.destination || '']
      );
      r.total_expenses = exp;
      r.gross_profit = parseFloat(r.total_revenue) - parseFloat(exp);
      r.profit_margin = parseFloat(r.total_revenue) > 0
        ? ((parseFloat(r.total_revenue) - parseFloat(exp)) / parseFloat(r.total_revenue) * 100).toFixed(2)
        : 0;
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch destination-wise profitability' });
  }
});

// GET /api/profitability/monthly
router.get('/monthly', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
              COALESCE(SUM(CASE WHEN payment_type != 'refund' THEN amount ELSE 0 END), 0) -
              COALESCE(SUM(CASE WHEN payment_type = 'refund' THEN amount ELSE 0 END), 0) AS revenue,
              (SELECT COALESCE(SUM(amount), 0) FROM expenses
               WHERE DATE_FORMAT(expense_date, '%Y-%m') = DATE_FORMAT(payments.payment_date, '%Y-%m')) AS expenses
       FROM payments
       WHERE payment_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
       ORDER BY month ASC`
    );

    const enriched = results.map(r => ({
      ...r,
      profit: parseFloat(r.revenue) - parseFloat(r.expenses),
      margin: parseFloat(r.revenue) > 0
        ? ((parseFloat(r.revenue) - parseFloat(r.expenses)) / parseFloat(r.revenue) * 100).toFixed(2)
        : 0
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly profitability' });
  }
});

module.exports = router;
