import { useState, useEffect } from 'react';
import api from '../../services/api';

const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const TABS = [
  { key: 'tour-wise', label: 'Tour-wise' },
  { key: 'customer-wise', label: 'Customer-wise' },
  { key: 'destination-wise', label: 'Destination-wise' },
  { key: 'monthly', label: 'Monthly' },
];

const ENDPOINTS = {
  'tour-wise': '/api/profitability/tour-wise',
  'customer-wise': '/api/profitability/customer-wise',
  'destination-wise': '/api/profitability/destination-wise',
  'monthly': '/api/profitability/monthly',
};

export default function Profitability() {
  const [activeTab, setActiveTab] = useState('tour-wise');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(ENDPOINTS[activeTab]);
        setData(res.data.data || res.data || []);
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const renderTourWise = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Tour</th>
          <th>Bookings</th>
          <th>Revenue</th>
          <th>Expenses</th>
          <th>Gross Profit</th>
          <th>Margin %</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.tour_name || row.tour || '-'}</td>
            <td>{row.bookings ?? row.total_bookings ?? '-'}</td>
            <td>{formatCurrency(row.revenue)}</td>
            <td>{formatCurrency(row.expenses)}</td>
            <td>{formatCurrency(row.gross_profit ?? (row.revenue - row.expenses))}</td>
            <td>{row.margin != null ? `${Number(row.margin).toFixed(1)}%` : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderCustomerWise = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Bookings</th>
          <th>Revenue</th>
          <th>Expenses</th>
          <th>Gross Profit</th>
          <th>Margin %</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.customer_name || row.customer || '-'}</td>
            <td>{row.bookings ?? row.total_bookings ?? '-'}</td>
            <td>{formatCurrency(row.revenue)}</td>
            <td>{formatCurrency(row.expenses)}</td>
            <td>{formatCurrency(row.gross_profit ?? (row.revenue - row.expenses))}</td>
            <td>{row.margin != null ? `${Number(row.margin).toFixed(1)}%` : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderDestinationWise = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Destination</th>
          <th>Bookings</th>
          <th>Revenue</th>
          <th>Expenses</th>
          <th>Gross Profit</th>
          <th>Margin %</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.destination || '-'}</td>
            <td>{row.bookings ?? row.total_bookings ?? '-'}</td>
            <td>{formatCurrency(row.revenue)}</td>
            <td>{formatCurrency(row.expenses)}</td>
            <td>{formatCurrency(row.gross_profit ?? (row.revenue - row.expenses))}</td>
            <td>{row.margin != null ? `${Number(row.margin).toFixed(1)}%` : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderMonthly = () => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Revenue</th>
          <th>Expenses</th>
          <th>Profit</th>
          <th>Margin %</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row.month || '-'}</td>
            <td>{formatCurrency(row.revenue)}</td>
            <td>{formatCurrency(row.expenses)}</td>
            <td>{formatCurrency(row.profit ?? (row.revenue - row.expenses))}</td>
            <td>{row.margin != null ? `${Number(row.margin).toFixed(1)}%` : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderContent = () => {
    if (loading) return <div className="loading">Loading...</div>;
    if (data.length === 0) return <div className="empty-state">No data found.</div>;

    switch (activeTab) {
      case 'tour-wise': return renderTourWise();
      case 'customer-wise': return renderCustomerWise();
      case 'destination-wise': return renderDestinationWise();
      case 'monthly': return renderMonthly();
      default: return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Profitability Reports</h2>
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

      <div className="tab-content">
        {renderContent()}
      </div>
    </div>
  );
}
