const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const salesFilter = userRole === 'sales' ? 'WHERE assigned_to = ?' : '';
    const salesParams = userRole === 'sales' ? [userId] : [];
    const salesBookFilter = userRole === 'sales' ? 'WHERE created_by = ?' : '';
    const salesBookParams = userRole === 'sales' ? [userId] : [];

    const addSalesWhere = (base, userClause) => {
      if (userRole !== 'sales') return base;
      return base ? `${base} AND ${userClause}` : `WHERE ${userClause}`;
    };

    // --- KPI CARDS ---
    const [[{ newEnquiries }]] = await pool.query(
      `SELECT COUNT(*) AS newEnquiries FROM leads WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE()) ${userRole === 'sales' ? 'AND assigned_to = ?' : ''}`,
      userRole === 'sales' ? [userId] : []
    );

    const [[{ activeLeads }]] = await pool.query(
      `SELECT COUNT(*) AS activeLeads FROM leads ${addSalesWhere(salesFilter, 'assigned_to = ?')} AND status IN ('new','quotation','followup')`,
      userRole === 'sales' ? [userId] : []
    );

    const [[{ confirmedBookings }]] = await pool.query(
      `SELECT COUNT(*) AS confirmedBookings FROM bookings ${addSalesWhere(salesBookFilter, 'created_by = ?')} AND status = 'confirmed'`,
      userRole === 'sales' ? [userId] : []
    );

    const [[{ upcomingTours }]] = await pool.query(
      `SELECT COUNT(*) AS upcomingTours FROM bookings ${addSalesWhere(salesBookFilter, 'created_by = ?')} AND status IN ('confirmed','pending') AND travel_start_date >= CURDATE()`,
      userRole === 'sales' ? [userId] : []
    );

    const [[{ pendingPayments }]] = await pool.query(
      `SELECT COUNT(*) AS pendingPayments FROM bookings ${addSalesWhere(salesBookFilter, 'created_by = ?')} AND balance_amount > 0 AND status != 'cancelled'`,
      userRole === 'sales' ? [userId] : []
    );

    const [[{ monthlyRevenue }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS monthlyRevenue FROM payments
       WHERE MONTH(payment_date) = MONTH(CURRENT_DATE()) AND YEAR(payment_date) = YEAR(CURRENT_DATE()) AND payment_type != 'refund'
       ${userRole === 'sales' ? 'AND created_by = ?' : ''}`,
      userRole === 'sales' ? [userId] : []
    );

    const [[{ monthlyExpenses }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS monthlyExpenses FROM expenses
       WHERE MONTH(expense_date) = MONTH(CURRENT_DATE()) AND YEAR(expense_date) = YEAR(CURRENT_DATE())
       ${userRole === 'sales' ? 'AND created_by = ?' : ''}`,
      userRole === 'sales' ? [userId] : []
    );

    const estimatedProfit = monthlyRevenue - monthlyExpenses;

    // --- TODAY'S TASKS ---
    const [todayFollowups] = await pool.query(
      `SELECT f.id, f.followup_date, f.followup_time, f.notes, f.status, l.name AS lead_name, l.phone AS lead_phone, l.id AS lead_id
       FROM followups f JOIN leads l ON f.lead_id = l.id
       WHERE f.followup_date = CURDATE() AND f.status = 'pending'
       ${userRole === 'sales' ? 'AND f.user_id = ?' : ''}
       ORDER BY f.followup_time ASC LIMIT 10`,
      userRole === 'sales' ? [userId] : []
    );

    const [todayPayments] = await pool.query(
      `SELECT b.booking_id, b.balance_amount, b.tour_name, c.name AS customer_name, b.id AS booking_id_pk
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.balance_amount > 0 AND b.status != 'cancelled'
       ${userRole === 'sales' ? 'AND b.created_by = ?' : ''}
       ORDER BY b.balance_amount DESC LIMIT 10`,
      userRole === 'sales' ? [userId] : []
    );

    const [pendingDocuments] = await pool.query(
      `SELECT d.id, d.title, d.document_type, d.created_at, c.name AS customer_name
       FROM documents d LEFT JOIN customers c ON d.customer_id = c.id
       WHERE d.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       ORDER BY d.created_at DESC LIMIT 10`
    );

    const [supplierConfirmations] = await pool.query(
      `SELECT e.id, e.description, e.amount, e.expense_date, e.payment_status, s.name AS supplier_name
       FROM expenses e JOIN suppliers s ON e.supplier_id = s.id
       WHERE e.payment_status = 'pending'
       ORDER BY e.expense_date ASC LIMIT 10`
    );

    // --- UPCOMING TOURS ---
    const [upcomingToursList] = await pool.query(
      `SELECT b.booking_id, b.tour_name, b.destination, b.travel_start_date, b.travel_end_date,
              b.travelers, b.status, c.name AS customer_name, c.phone AS customer_phone
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.status IN ('confirmed','pending') AND b.travel_start_date >= CURDATE()
       ${userRole === 'sales' ? 'AND b.created_by = ?' : ''}
       ORDER BY b.travel_start_date ASC LIMIT 10`,
      userRole === 'sales' ? [userId] : []
    );

    // --- RECENT ENQUIRIES ---
    const [recentEnquiries] = await pool.query(
      `SELECT l.id, l.name, l.phone, l.destination, l.travel_date, l.budget, l.lead_source, l.status, l.created_at
       FROM leads l ${salesFilter ? salesFilter : ''}
       ORDER BY l.created_at DESC LIMIT 10`,
      salesParams
    );

    // --- RECENT PAYMENTS ---
    const [recentPayments] = await pool.query(
      `SELECT p.id, p.amount, p.payment_type, p.payment_method, p.payment_date, p.receipt_number, p.status,
              c.name AS customer_name, b.booking_id AS booking_ref
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN bookings b ON p.booking_id = b.id
       ${userRole === 'sales' ? 'WHERE p.created_by = ?' : ''}
       ORDER BY p.created_at DESC LIMIT 10`,
      userRole === 'sales' ? [userId] : []
    );

    // --- REVENUE & BOOKING CHART (last 6 months) ---
    const [revenueChart] = await pool.query(
      `SELECT DATE_FORMAT(dt.month_start, '%b') AS month,
              DATE_FORMAT(dt.month_start, '%Y-%m') AS month_key,
              COALESCE(b_data.bookings, 0) AS bookings,
              COALESCE(b_data.revenue, 0) AS revenue
       FROM (
         SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL n MONTH) AS month_start
         FROM (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) nums
       ) dt
       LEFT JOIN (
         SELECT DATE_FORMAT(created_at, '%Y-%m-01') AS month_start,
                COUNT(*) AS bookings,
                COALESCE(SUM(paid_amount), 0) AS revenue
         FROM bookings
         WHERE status != 'cancelled'
         ${userRole === 'sales' ? 'AND created_by = ?' : ''}
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
       ) b_data ON dt.month_start = b_data.month_start
       ORDER BY dt.month_start ASC`,
      userRole === 'sales' ? [userId] : []
    );

    // --- LEAD CONVERSION CHART ---
    const [leadConversion] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM leads ${salesFilter ? salesFilter : ''} GROUP BY status ORDER BY
       FIELD(status, 'new','quotation','followup','confirmed','lost')`,
      salesParams
    );

    // --- OVERDUE FOLLOW-UPS ---
    const [[{ overdueFollowups }]] = await pool.query(
      `SELECT COUNT(*) AS overdueFollowups FROM followups
       WHERE followup_date < CURDATE() AND status = 'pending'
       ${userRole === 'sales' ? 'AND user_id = ?' : ''}`,
      userRole === 'sales' ? [userId] : []
    );

    const todayTasks = {
      followups: todayFollowups,
      payments: todayPayments,
      documents: pendingDocuments,
      supplierConfirmations,
      overdueFollowups,
    };

    res.json({
      kpis: {
        newEnquiries,
        activeLeads,
        confirmedBookings,
        upcomingTours,
        pendingPayments,
        monthlyRevenue,
        monthlyExpenses,
        estimatedProfit,
      },
      todayTasks,
      upcomingToursList,
      recentEnquiries,
      recentPayments,
      revenueChart,
      leadConversion,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
