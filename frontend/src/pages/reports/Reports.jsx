import { useState, useEffect } from 'react';
import api from '../../services/api';

const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const TABS = [
  { key: 'sales', label: 'Sales' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'expense', label: 'Expense' },
  { key: 'profit-loss', label: 'Profit/Loss' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'lead-conversion', label: 'Lead Conversion' },
  { key: 'destination-performance', label: 'Destination' },
];

const ENDPOINTS = {
  sales: '/api/reports/sales',
  bookings: '/api/reports/bookings',
  revenue: '/api/reports/revenue',
  expense: '/api/reports/expense',
  'profit-loss': '/api/reports/profit-loss',
  outstanding: '/api/reports/outstanding',
  'lead-conversion': '/api/reports/lead-conversion',
  'destination-performance': '/api/reports/destination-performance',
};

const YEAR_TABS = ['revenue', 'expense', 'profit-loss'];

function YearSelector({ year, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return (
    <select value={year} onChange={(e) => onChange(e.target.value)}>
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (YEAR_TABS.includes(activeTab)) {
          params.year = year;
        }
        const res = await api.get(ENDPOINTS[activeTab], { params });
        setData(res.data.data || res.data || []);
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, year]);

  const renderSales = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Bookings</th>
          <th>Total Value</th>
          <th>Amount Received</th>
          <th>Outstanding</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.date ? row.date.slice(0, 10) : row.month || '-'}</td>
            <td>{row.bookings ?? row.total_bookings ?? '-'}</td>
            <td>{formatCurrency(row.total_value)}</td>
            <td>{formatCurrency(row.amount_received)}</td>
            <td>{formatCurrency(row.outstanding)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBookings = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Count</th>
          <th>Total Value</th>
          <th>Amount Paid</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td><span className="badge">{row.status}</span></td>
            <td>{row.count ?? '-'}</td>
            <td>{formatCurrency(row.total_value)}</td>
            <td>{formatCurrency(row.amount_paid)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderRevenue = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Revenue</th>
          <th>Refunds</th>
          <th>Transactions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.month || '-'}</td>
            <td>{formatCurrency(row.revenue)}</td>
            <td>{formatCurrency(row.refunds)}</td>
            <td>{row.transactions ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderExpense = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Total</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td><span className="badge">{row.category}</span></td>
            <td>{formatCurrency(row.total)}</td>
            <td>{row.count ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderProfitLoss = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Revenue</th>
          <th>Expenses</th>
          <th>Profit/Loss</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.month || '-'}</td>
            <td>{formatCurrency(row.revenue)}</td>
            <td>{formatCurrency(row.expenses)}</td>
            <td className={row.profit_loss != null && row.profit_loss < 0 ? 'text-danger' : 'text-success'}>
              {formatCurrency(row.profit_loss)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderOutstanding = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Booking</th>
          <th>Customer</th>
          <th>Total</th>
          <th>Paid</th>
          <th>Balance</th>
          <th>Travel Date</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.booking_id || row.booking || '-'}</td>
            <td>{row.customer_name || row.customer || '-'}</td>
            <td>{formatCurrency(row.total)}</td>
            <td>{formatCurrency(row.paid)}</td>
            <td className="text-danger">{formatCurrency(row.balance)}</td>
            <td>{row.travel_date ? row.travel_date.slice(0, 10) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderLeadConversion = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Source</th>
          <th>Total</th>
          <th>Converted</th>
          <th>Lost</th>
          <th>In Progress</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.source || '-'}</td>
            <td>{row.total ?? '-'}</td>
            <td>{row.converted ?? '-'}</td>
            <td>{row.lost ?? '-'}</td>
            <td>{row.in_progress ?? '-'}</td>
            <td>{row.rate != null ? `${Number(row.rate).toFixed(1)}%` : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderDestinationPerformance = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Destination</th>
          <th>Bookings</th>
          <th>Total Value</th>
          <th>Amount Received</th>
          <th>Avg Value</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.destination || '-'}</td>
            <td>{row.bookings ?? row.total_bookings ?? '-'}</td>
            <td>{formatCurrency(row.total_value)}</td>
            <td>{formatCurrency(row.amount_received)}</td>
            <td>{formatCurrency(row.avg_value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderContent = () => {
    if (loading) return <div className="loading">Loading...</div>;
    if (data.length === 0) return <div className="empty-state">No data found.</div>;

    switch (activeTab) {
      case 'sales': return renderSales();
      case 'bookings': return renderBookings();
      case 'revenue': return renderRevenue();
      case 'expense': return renderExpense();
      case 'profit-loss': return renderProfitLoss();
      case 'outstanding': return renderOutstanding();
      case 'lead-conversion': return renderLeadConversion();
      case 'destination-performance': return renderDestinationPerformance();
      default: return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Reports</h2>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {YEAR_TABS.includes(activeTab) && (
        <div className="filters" style={{ marginBottom: '1rem' }}>
          <label>Year: </label>
          <YearSelector year={year} onChange={setYear} />
        </div>
      )}

      <div className="tab-content">
        {renderContent()}
      </div>
    </div>
  );
}
