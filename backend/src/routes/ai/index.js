const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');
const { assist, checkHealth } = require('../../services/aiService');

router.use(auth);

router.get('/health', async (req, res) => {
  try {
    const health = await checkHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function fetchBusinessData(prompt, userId, userRole) {
  const lowerPrompt = prompt.toLowerCase();
  const data = {};

  const salesFilter = userRole === 'sales' ? 'AND assigned_to = ?' : '';
  const salesParam = userRole === 'sales' ? [userId] : [];

  const needsLeads =
    lowerPrompt.includes('lead') || lowerPrompt.includes('enquiry') ||
    lowerPrompt.includes('follow-up') || lowerPrompt.includes('followup') ||
    lowerPrompt.includes('contact') || lowerPrompt.includes('quotation');

  const needsCustomers =
    lowerPrompt.includes('customer') || lowerPrompt.includes('client') ||
    lowerPrompt.includes('guest');

  const needsBookings =
    lowerPrompt.includes('booking') || lowerPrompt.includes('confirmed') ||
    lowerPrompt.includes('reservation') || lowerPrompt.includes('tour') ||
    lowerPrompt.includes('itinerary') || lowerPrompt.includes('travel');

  const needsPayments =
    lowerPrompt.includes('payment') || lowerPrompt.includes('revenue') ||
    lowerPrompt.includes('pending') || lowerPrompt.includes('balance') ||
    lowerPrompt.includes('paid') || lowerPrompt.includes('invoice');

  const needsQuotations =
    lowerPrompt.includes('quotation') || lowerPrompt.includes('price') ||
    lowerPrompt.includes('pricing') || lowerPrompt.includes('cost');

  const needsTours =
    lowerPrompt.includes('tour') || lowerPrompt.includes('package') ||
    lowerPrompt.includes('destination') || lowerPrompt.includes('itinerary') ||
    lowerPrompt.includes('goa') || lowerPrompt.includes('kerala') ||
    lowerPrompt.includes('rajasthan') || lowerPrompt.includes('manali');

  const isAnalysis =
    lowerPrompt.includes('summarize') || lowerPrompt.includes('summary') ||
    lowerPrompt.includes('analyze') || lowerPrompt.includes('analysis') ||
    lowerPrompt.includes('report') || lowerPrompt.includes('overview') ||
    lowerPrompt.includes('how many') || lowerPrompt.includes('statistics') ||
    lowerPrompt.includes('performance') || lowerPrompt.includes('month') ||
    lowerPrompt.includes('today') || lowerPrompt.includes('this week');

  try {
    if (needsLeads || isAnalysis) {
      const [leads] = await pool.query(
        `SELECT id, name, phone, email, destination, travel_date, status, priority,
                lead_source, created_at, assigned_to
         FROM leads WHERE status IN ('new','quotation','followup')
         ${userRole === 'sales' ? 'AND assigned_to = ?' : ''}
         ORDER BY created_at DESC LIMIT 30`,
        userRole === 'sales' ? [userId] : []
      );

      const [[{ newCount }]] = await pool.query(
        `SELECT COUNT(*) AS newCount FROM leads WHERE status = 'new'
         ${userRole === 'sales' ? 'AND assigned_to = ?' : ''}`,
        userRole === 'sales' ? [userId] : []
      );

      const [[{ followupCount }]] = await pool.query(
        `SELECT COUNT(*) AS followupCount FROM leads WHERE status = 'followup'
         ${userRole === 'sales' ? 'AND assigned_to = ?' : ''}`,
        userRole === 'sales' ? [userId] : []
      );

      const [pendingFollowups] = await pool.query(
        `SELECT f.id, f.followup_date, f.followup_time, f.notes, f.status,
                l.name AS lead_name, l.phone AS lead_phone
         FROM followups f JOIN leads l ON f.lead_id = l.id
         WHERE f.status = 'pending' AND f.followup_date >= CURDATE()
         ${userRole === 'sales' ? 'AND l.assigned_to = ?' : ''}
         ORDER BY f.followup_date ASC LIMIT 20`,
        userRole === 'sales' ? [userId] : []
      );

      const leadsSummary = leads.map(l => ({
        id: l.id,
        name: l.name,
        destination: l.destination,
        status: l.status,
        priority: l.priority,
        travel_date: l.travel_date,
        created: l.created_at,
      }));

      data.leads = {
        newCount,
        followupCount,
        totalListed: leads.length,
        items: leadsSummary,
      };

      if (pendingFollowups.length > 0) {
        data.leads.pendingFollowups = pendingFollowups.map(f => ({
          lead: f.lead_name,
          phone: f.lead_phone,
          date: f.followup_date,
          time: f.followup_time,
          notes: f.notes,
        }));
      }
    }

    if (needsCustomers || isAnalysis) {
      const [customers] = await pool.query(
        `SELECT c.id, c.name, c.phone, c.email, c.address,
                COUNT(b.id) AS total_bookings,
                COALESCE(SUM(b.total_amount), 0) AS total_spent
         FROM customers c
         LEFT JOIN bookings b ON b.customer_id = c.id
         GROUP BY c.id
         ORDER BY total_bookings DESC LIMIT 20`
      );
      data.customers = customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalBookings: c.total_bookings,
        totalSpent: c.total_spent,
      }));
    }

    if (needsTours || isAnalysis) {
      const [tours] = await pool.query(
        `SELECT id, name, destination, duration_days, duration_nights,
                base_price, status, created_at
         FROM tour_packages
         ORDER BY created_at DESC LIMIT 20`
      );
      data.tours = tours;
    }

    if (needsBookings || isAnalysis) {
      const [bookings] = await pool.query(
        `SELECT b.id, c.name AS customer_name, tp.name AS tour_name,
                b.travel_start_date, b.travel_end_date, b.total_amount,
                b.balance_amount, b.status, b.payment_status
         FROM bookings b
         JOIN customers c ON b.customer_id = c.id
         LEFT JOIN tour_packages tp ON b.tour_id = tp.id
         WHERE b.status != 'cancelled'
         ORDER BY b.travel_start_date ASC LIMIT 20`
      );

      const [[{ upcomingCount }]] = await pool.query(
        `SELECT COUNT(*) AS upcomingCount FROM bookings
         WHERE status IN ('confirmed','pending')
         AND travel_start_date >= CURDATE()`
      );

      data.bookings = {
        upcomingCount,
        items: bookings,
      };
    }

    if (needsPayments || isAnalysis) {
      const [pendingPayments] = await pool.query(
        `SELECT b.id, c.name AS customer_name, tp.name AS tour_name,
                b.total_amount, b.balance_amount, b.payment_status,
                b.travel_start_date
         FROM bookings b
         JOIN customers c ON b.customer_id = c.id
         LEFT JOIN tour_packages tp ON b.tour_id = tp.id
         WHERE b.balance_amount > 0 AND b.status != 'cancelled'
         ORDER BY b.travel_start_date ASC LIMIT 20`
      );

      const [[{ totalPending }]] = await pool.query(
        `SELECT COALESCE(SUM(balance_amount), 0) AS totalPending
         FROM bookings WHERE balance_amount > 0 AND status != 'cancelled'`
      );

      const [[{ monthlyRevenue }]] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS monthlyRevenue
         FROM payments WHERE MONTH(payment_date) = MONTH(CURRENT_DATE())
         AND YEAR(payment_date) = YEAR(CURRENT_DATE()) AND payment_type != 'refund'`
      );

      data.payments = {
        totalPending,
        monthlyRevenue,
        items: pendingPayments,
      };
    }

    if (needsQuotations || isAnalysis) {
      const [quotations] = await pool.query(
        `SELECT q.id, c.name AS customer_name, tp.name AS tour_name,
                q.total_amount, q.status, q.valid_until, q.created_at
         FROM quotations q
         JOIN customers c ON q.customer_id = c.id
         LEFT JOIN tour_packages tp ON q.tour_id = tp.id
         ORDER BY q.created_at DESC LIMIT 15`
      );
      data.quotations = quotations;
    }

    if (isAnalysis) {
      const [[{ totalCustomers }]] = await pool.query(
        'SELECT COUNT(*) AS totalCustomers FROM customers'
      );

      const [[{ totalBookings }]] = await pool.query(
        `SELECT COUNT(*) AS totalBookings FROM bookings
         WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
         AND YEAR(created_at) = YEAR(CURRENT_DATE())`
      );

      data.summary = {
        totalCustomers,
        monthlyBookings: totalBookings,
        analysisTimestamp: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error fetching business data for AI:', err.message);
  }

  return data;
}

router.post('/assist', async (req, res) => {
  try {
    const { prompt, conversationHistory, includeBusinessData = true } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({ error: 'prompt is too long (max 4000 characters)' });
    }

    let businessData = null;
    if (includeBusinessData) {
      businessData = await fetchBusinessData(prompt, req.user.id, req.user.role);
    }

    const response = await assist(prompt, businessData, conversationHistory || []);

    res.json({ response });
  } catch (err) {
    console.error('AI assist error:', err.message);
    const statusCode = err.message.includes('not configured') ? 503 : 500;
    res.status(statusCode).json({
      error: err.message,
      retryable: err.message.includes('timed out') || err.message.includes('rate'),
    });
  }
});

module.exports = router;
