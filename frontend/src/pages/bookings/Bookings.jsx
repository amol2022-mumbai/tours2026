import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [tours, setTours] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [form, setForm] = useState({
    quotation_id: '', customer_id: '', package_id: '', tour_name: '', destination: '',
    travel_start_date: '', travel_end_date: '', travelers: 1, adult_count: 1,
    child_count: 0, infant_count: 0, total_amount: 0, advance_amount: 0, special_requests: ''
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { fetchBookings(); loadDropdowns(); }, [pagination.page, filters]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/bookings', { params });
      setBookings(data.data);
      setPagination(data.pagination);
    } catch (err) { /* silent */ } finally { setLoading(false); }
  };

  const loadDropdowns = async () => {
    try {
      const [cRes, tRes, qRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/tours', { params: { limit: 100 } }),
        api.get('/quotations', { params: { limit: 100, status: 'accepted,draft' } })
      ]);
      setCustomers(cRes.data.data);
      setTours(tRes.data.data);
      setQuotations(qRes.data.data);
    } catch (err) { /* silent */ }
  };

  const openCreate = () => {
    const st = location.state || {};
    setForm({
      quotation_id: st.quotationId || '', customer_id: st.customerId || '', package_id: st.packageId || '',
      tour_name: '', destination: '', travel_start_date: '', travel_end_date: '',
      travelers: 1, adult_count: 1, child_count: 0, infant_count: 0,
      total_amount: st.total || 0, advance_amount: 0, special_requests: ''
    });
    setShowModal(true);
  };

  const handleQuotationSelect = (qId) => {
    const q = quotations.find(qu => qu.id == qId);
    if (q) {
      setForm(f => ({
        ...f, quotation_id: qId, customer_id: q.customer_id || '', package_id: q.package_id || '',
        destination: q.destination || '', travelers: q.travelers, total_amount: q.total
      }));
    }
  };

  const handleTourSelect = (pId) => {
    const t = tours.find(tr => tr.id == pId);
    if (t) setForm(f => ({ ...f, package_id: pId, tour_name: t.name, destination: t.destination, total_amount: t.selling_price * form.travelers }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bookings', form);
      setShowModal(false);
      fetchBookings();
    } catch (err) { alert(err.response?.data?.error || 'Failed to create'); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/bookings/${id}/status`, { status });
    fetchBookings();
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
  const statusBadge = (s) => {
    const map = { pending: 'warning', confirmed: 'success', cancelled: 'danger', completed: 'info' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Booking Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Booking</button>
      </div>

      <div className="filter-bar">
        <input placeholder="Search bookings..." value={filters.search} onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPagination({ ...pagination, page: 1 }); }} />
        <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPagination({ ...pagination, page: 1 }); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading"><div className="spinner" /></div> :
          bookings.length === 0 ? <div className="empty-state"><h3>No bookings found</h3></div> : (
          <table><thead><tr><th>Booking ID</th><th>Customer</th><th>Tour</th><th>Dates</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{bookings.map(b => (
              <tr key={b.id}>
                <td><a href="#" onClick={(e) => { e.preventDefault(); navigate(`/bookings/${b.id}`); }}><strong>{b.booking_id}</strong></a></td>
                <td>{b.customer_name}</td>
                <td>{b.tour_name || b.destination || '-'}</td>
                <td>{b.travel_start_date ? new Date(b.travel_start_date).toLocaleDateString() : '-'}</td>
                <td>{formatCurrency(b.total_amount)}</td>
                <td>{formatCurrency(b.paid_amount)}</td>
                <td style={{ color: b.balance_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(b.balance_amount)}</td>
                <td>{statusBadge(b.status)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)} style={{ padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--gray-300)' }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header"><h2>New Booking</h2><button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group"><label>Quotation (Optional)</label><select className="form-control" value={form.quotation_id} onChange={(e) => handleQuotationSelect(e.target.value)}><option value="">None</option>{quotations.map(q => <option key={q.id} value={q.id}>{q.quotation_number} - {q.destination}</option>)}</select></div>
                  <div className="form-group"><label>Customer *</label><select className="form-control" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required><option value="">Select Customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="form-group"><label>Tour Package</label><select className="form-control" value={form.package_id} onChange={(e) => handleTourSelect(e.target.value)}><option value="">Select Package</option>{tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                  <div className="form-group"><label>Tour Name</label><input className="form-control" value={form.tour_name} onChange={(e) => setForm({ ...form, tour_name: e.target.value })} /></div>
                  <div className="form-group"><label>Destination</label><input className="form-control" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                  <div className="form-group"><label>Total Travelers</label><input type="number" className="form-control" value={form.travelers} onChange={(e) => setForm({ ...form, travelers: parseInt(e.target.value) })} /></div>
                  <div className="form-group"><label>Start Date</label><input type="date" className="form-control" value={form.travel_start_date} onChange={(e) => setForm({ ...form, travel_start_date: e.target.value })} /></div>
                  <div className="form-group"><label>End Date</label><input type="date" className="form-control" value={form.travel_end_date} onChange={(e) => setForm({ ...form, travel_end_date: e.target.value })} /></div>
                </div>
                <h4 style={{ marginTop: '16px' }}>Traveller Count</h4>
                <div className="grid-3">
                  <div className="form-group"><label>Adults</label><input type="number" className="form-control" value={form.adult_count} onChange={(e) => setForm({ ...form, adult_count: parseInt(e.target.value) })} min="0" /></div>
                  <div className="form-group"><label>Children</label><input type="number" className="form-control" value={form.child_count} onChange={(e) => setForm({ ...form, child_count: parseInt(e.target.value) })} min="0" /></div>
                  <div className="form-group"><label>Infants</label><input type="number" className="form-control" value={form.infant_count} onChange={(e) => setForm({ ...form, infant_count: parseInt(e.target.value) })} min="0" /></div>
                </div>
                <div className="grid-2" style={{ marginTop: '12px' }}>
                  <div className="form-group"><label>Total Amount</label><input type="number" className="form-control" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) })} /></div>
                  <div className="form-group"><label>Advance Amount</label><input type="number" className="form-control" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="form-group"><label>Special Requests</label><textarea className="form-control" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
