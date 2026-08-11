import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';
import Tabs from '../../components/ui/Tabs';
import './Dashboard.css';

const LEAD_STATUSES = ['new', 'quotation', 'followup', 'confirmed', 'lost'];
const CONVERSION_COLORS = { new: '#3b82f6', quotation: '#8b5cf6', followup: '#f59e0b', confirmed: '#10b981', lost: '#ef4444' };

export default function Dashboard() {
  const { data, loading, error, refetch } = useDashboard();
  const [taskTab, setTaskTab] = useState('followups');
  const navigate = useNavigate();

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />;
  if (error) return (
    <div className="page-container">
      <Alert type="error" onClose={() => refetch()}>{error}</Alert>
    </div>
  );
  if (!data) return <LoadingSpinner fullPage />;

  const { kpis, todayTasks, upcomingToursList, recentEnquiries, recentPayments, revenueChart, leadConversion } = data;

  const maxRevenue = Math.max(...revenueChart.map(d => parseFloat(d.revenue) || 0), 1);
  const maxBookings = Math.max(...revenueChart.map(d => d.bookings || 0), 1);

  const taskTabs = [
    { key: 'followups', label: 'Follow-ups', count: todayTasks.followups?.length },
    { key: 'payments', label: 'Payments Due', count: todayTasks.payments?.length },
    { key: 'documents', label: 'Documents', count: todayTasks.documents?.length },
    { key: 'supplier', label: 'Supplier Confirmations', count: todayTasks.supplierConfirmations?.length },
  ];

  const renderTaskContent = () => {
    switch (taskTab) {
      case 'followups':
        return todayTasks.followups?.length > 0 ? (
          <table className="compact-table">
            <thead><tr><th>Lead</th><th>Time</th><th>Notes</th></tr></thead>
            <tbody>{todayTasks.followups.map(f => (
              <tr key={f.id} onClick={() => navigate(`/leads/${f.lead_id}`)} className="clickable">
                <td><strong>{f.lead_name}</strong><br /><small>{f.lead_phone}</small></td>
                <td>{f.followup_time || '-'}</td>
                <td className="truncate-cell">{f.notes || '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState title="No follow-ups today" message="All caught up for today" />;
      case 'payments':
        return todayTasks.payments?.length > 0 ? (
          <table className="compact-table">
            <thead><tr><th>Customer</th><th>Booking</th><th>Pending Amount</th></tr></thead>
            <tbody>{todayTasks.payments.map(p => (
              <tr key={p.booking_id} onClick={() => navigate(`/bookings/${p.booking_id_pk}`)} className="clickable">
                <td><strong>{p.customer_name}</strong></td>
                <td>{p.booking_id}</td>
                <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatCurrency(p.balance_amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState title="No pending payments" message="All payments are up to date" />;
      case 'documents':
        return todayTasks.documents?.length > 0 ? (
          <table className="compact-table">
            <thead><tr><th>Document</th><th>Customer</th><th>Type</th><th>Date</th></tr></thead>
            <tbody>{todayTasks.documents.map(d => (
              <tr key={d.id}>
                <td><strong>{d.title || 'Untitled'}</strong></td>
                <td>{d.customer_name || '-'}</td>
                <td><Badge color="gray">{d.document_type}</Badge></td>
                <td>{formatDate(d.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState title="No recent documents" message="Uploaded documents will appear here" />;
      case 'supplier':
        return todayTasks.supplierConfirmations?.length > 0 ? (
          <table className="compact-table">
            <thead><tr><th>Supplier</th><th>Description</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{todayTasks.supplierConfirmations.map(s => (
              <tr key={s.id}>
                <td><strong>{s.supplier_name}</strong></td>
                <td className="truncate-cell">{s.description || '-'}</td>
                <td>{formatCurrency(s.amount)}</td>
                <td>{formatDate(s.expense_date)}</td>
                <td><Badge color={s.payment_status === 'paid' ? 'success' : 'warning'}>{s.payment_status}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState title="No pending confirmations" message="All supplier payments confirmed" />;
      default: return null;
    }
  };

  return (
    <div className="dashboard">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
            Welcome back, here's your business overview for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={refetch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard label="New Enquiries" value={kpis.newEnquiries} sub="This month" color="#3b82f6"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>} />
        <StatCard label="Active Leads" value={kpis.activeLeads} sub="In pipeline" color="#8b5cf6"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>} />
        <StatCard label="Confirmed Bookings" value={kpis.confirmedBookings} sub="All time" color="#10b981"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} />
        <StatCard label="Upcoming Tours" value={kpis.upcomingTours} sub="Scheduled" color="#06b6d4"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>} />
        <StatCard label="Pending Payments" value={kpis.pendingPayments} sub="Outstanding" color="#f59e0b"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>} />
        <StatCard label="Monthly Revenue" value={formatCurrency(kpis.monthlyRevenue)} sub="This month" color="#059669"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>} />
        <StatCard label="Monthly Expenses" value={formatCurrency(kpis.monthlyExpenses)} sub="This month" color="#dc2626"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>} />
        <StatCard label="Estimated Profit" value={formatCurrency(kpis.estimatedProfit)} sub="This month"
          color={kpis.estimatedProfit >= 0 ? '#059669' : '#dc2626'}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>} />
      </div>

      <div className="dashboard-grid">
        <Card title="Today's Tasks">
          <Tabs tabs={taskTabs} activeTab={taskTab} onTabChange={setTaskTab} />
          <div className="task-content">
            {renderTaskContent()}
          </div>
        </Card>

        <Card title="Upcoming Tours">
          {upcomingToursList?.length > 0 ? (
            <table className="compact-table">
              <thead><tr><th>Customer</th><th>Destination</th><th>Date</th><th>Travelers</th><th>Status</th></tr></thead>
              <tbody>{upcomingToursList.map(t => (
                <tr key={t.booking_id} onClick={() => navigate(`/bookings/${t.booking_id}`)} className="clickable">
                  <td><strong>{t.customer_name}</strong></td>
                  <td>{t.destination || t.tour_name}</td>
                  <td>{formatDate(t.travel_start_date)}</td>
                  <td>{t.travelers}</td>
                  <td><Badge color={getStatusColor(t.status)}>{t.status}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <EmptyState title="No upcoming tours" message="Bookings with future travel dates will appear here" />}
        </Card>

        <Card title="Recent Enquiries">
          {recentEnquiries?.length > 0 ? (
            <table className="compact-table">
              <thead><tr><th>Customer</th><th>Destination</th><th>Date</th><th>Budget</th><th>Source</th><th>Status</th></tr></thead>
              <tbody>{recentEnquiries.map(e => (
                <tr key={e.id} onClick={() => navigate(`/leads/${e.id}`)} className="clickable">
                  <td><strong>{e.name}</strong></td>
                  <td>{e.destination || '-'}</td>
                  <td>{formatDate(e.travel_date)}</td>
                  <td>{e.budget ? formatCurrency(e.budget) : '-'}</td>
                  <td><Badge color="gray">{e.lead_source}</Badge></td>
                  <td><Badge color={getStatusColor(e.status)}>{e.status}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <EmptyState title="No enquiries yet" message="New leads and enquiries will appear here" />}
        </Card>

        <Card title="Recent Payments">
          {recentPayments?.length > 0 ? (
            <table className="compact-table">
              <thead><tr><th>Customer</th><th>Booking</th><th>Amount</th><th>Date</th><th>Type</th></tr></thead>
              <tbody>{recentPayments.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.customer_name || '-'}</strong></td>
                  <td>{p.booking_ref || '-'}</td>
                  <td style={{ fontWeight: 600, color: p.payment_type === 'refund' ? '#dc2626' : '#059669' }}>
                    {p.payment_type === 'refund' ? '-' : ''}{formatCurrency(p.amount)}
                  </td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td><Badge color={getStatusColor(p.payment_type)}>{p.payment_type}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <EmptyState title="No payments yet" message="Payment records will appear here" />}
        </Card>
      </div>

      <div className="dashboard-grid" style={{ marginTop: 0 }}>
        <Card title="Revenue & Bookings (6 Months)">
          {revenueChart?.length > 0 ? (
            <div className="chart-container">
              <div className="chart-bars">
                {revenueChart.map((m, i) => (
                  <div key={i} className="chart-bar-group">
                    <div className="chart-bar-wrapper">
                      <div className="chart-bar chart-bar-revenue" style={{ height: `${(parseFloat(m.revenue) / maxRevenue) * 100}%` }} title={`Revenue: ${formatCurrency(m.revenue)}`} />
                      <div className="chart-bar chart-bar-bookings" style={{ height: `${((m.bookings || 0) / maxBookings) * 100}%` }} title={`Bookings: ${m.bookings}`} />
                    </div>
                    <span className="chart-label">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span><span className="legend-dot" style={{ background: '#3b82f6' }} />Revenue</span>
                <span><span className="legend-dot" style={{ background: '#10b981' }} />Bookings</span>
              </div>
              <div className="chart-summary">
                {revenueChart.map((m, i) => (
                  <div key={i} className="chart-summary-item">
                    <span className="chart-summary-month">{m.month}</span>
                    <span className="chart-summary-val">{formatCurrency(m.revenue)}</span>
                    <span className="chart-summary-sub">{m.bookings} bookings</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState title="No chart data" message="Revenue data will build up over time" />}
        </Card>

        <Card title="Lead Conversion Funnel">
          {leadConversion?.length > 0 ? (
            <div className="chart-container">
              <div className="funnel-chart">
                {leadConversion.map((s, i) => {
                  const maxCount = Math.max(...leadConversion.map(l => l.count || 0), 1);
                  const pct = ((s.count || 0) / maxCount * 100);
                  return (
                    <div key={s.status} className="funnel-row">
                      <div className="funnel-label">
                        <Badge color={getStatusColor(s.status)}>{s.status}</Badge>
                      </div>
                      <div className="funnel-bar-wrapper">
                        <div className="funnel-bar" style={{ width: `${pct}%`, background: CONVERSION_COLORS[s.status] || '#94a3b8' }} />
                      </div>
                      <span className="funnel-count">{s.count}</span>
                      {i < leadConversion.length - 1 && (
                        <span className="funnel-pct">
                          {leadConversion[i+1].count > 0 && s.count > 0
                            ? `${Math.round((leadConversion[i+1].count / s.count) * 100)}%`
                            : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="chart-summary" style={{ marginTop: 16 }}>
                {leadConversion.map(s => (
                  <div key={s.status} className="chart-summary-item">
                    <span className="chart-summary-month">{s.status}</span>
                    <span className="chart-summary-val">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState title="No lead data" message="Lead conversion data will appear here" />}
        </Card>
      </div>
    </div>
  );
}
