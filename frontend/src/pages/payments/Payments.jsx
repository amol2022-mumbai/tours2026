import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ payment_type: '', start_date: '', end_date: '' });

  useEffect(() => { fetchPayments(); }, [pagination.page, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 30 };
      if (filters.payment_type) params.payment_type = filters.payment_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const { data } = await api.get('/payments', { params });
      setPayments(data.data);
      setPagination(data.pagination);
    } catch (err) { /* silent */ } finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="page-container">
      <div className="page-header"><h1>Payment Management</h1></div>

      <div className="filter-bar">
        <select value={filters.payment_type} onChange={(e) => { setFilters({ ...filters, payment_type: e.target.value }); setPagination({ ...pagination, page: 1 }); }}>
          <option value="">All Types</option>
          <option value="advance">Advance</option><option value="installment">Installment</option><option value="final">Final</option><option value="refund">Refund</option>
        </select>
        <input type="date" value={filters.start_date} onChange={(e) => { setFilters({ ...filters, start_date: e.target.value }); setPagination({ ...pagination, page: 1 }); }} placeholder="Start Date" />
        <input type="date" value={filters.end_date} onChange={(e) => { setFilters({ ...filters, end_date: e.target.value }); setPagination({ ...pagination, page: 1 }); }} placeholder="End Date" />
      </div>

      <div className="card">
        {loading ? <div className="loading"><div className="spinner" /></div> :
          payments.length === 0 ? <div className="empty-state"><h3>No payments found</h3></div> : (
          <table><thead><tr><th>Receipt #</th><th>Booking</th><th>Customer</th><th>Date</th><th>Amount</th><th>Type</th><th>Method</th></tr></thead>
            <tbody>{payments.map(p => (
              <tr key={p.id}>
                <td><strong>{p.receipt_number || '-'}</strong></td>
                <td>{p.booking_ref || '-'}</td>
                <td>{p.customer_name || '-'}</td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 600, color: p.payment_type === 'refund' ? 'var(--danger)' : 'var(--success)' }}>{p.payment_type === 'refund' ? '-' : ''}{formatCurrency(p.amount)}</td>
                <td><span className={`badge badge-${p.payment_type === 'refund' ? 'danger' : p.payment_type === 'final' ? 'success' : 'info'}`}>{p.payment_type}</span></td>
                <td><span className="badge badge-gray">{p.payment_method}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>Previous</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>Next</button>
        </div>
      )}
    </div>
  );
}
