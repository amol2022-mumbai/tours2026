import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [tours, setTours] = useState([]);
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({
    lead_id: '', customer_id: '', package_id: '', destination: '', travel_date: '',
    travelers: 1, duration_days: '', subtotal: 0, discount_percent: 0, discount_amount: 0,
    tax_percent: 0, tax_amount: 0, inclusions: '', exclusions: '', terms_conditions: '', validity_days: 15
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { fetchQuotations(); loadDropdowns(); }, [pagination.page, filters]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/quotations', { params });
      setQuotations(data.data);
      setPagination(data.pagination);
    } catch (err) { /* silent */ } finally { setLoading(false); }
  };

  const loadDropdowns = async () => {
    try {
      const [cRes, tRes, lRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/tours', { params: { limit: 100 } }),
        api.get('/leads', { params: { limit: 100, status: 'new,quotation,followup' } })
      ]);
      setCustomers(cRes.data.data);
      setTours(tRes.data.data);
      setLeads(lRes.data.data);
    } catch (err) { /* silent */ }
  };

  const openCreate = () => {
    const leadId = location.state?.leadId || '';
    setForm({
      lead_id: leadId, customer_id: '', package_id: '', destination: '', travel_date: '',
      travelers: 1, duration_days: '', subtotal: 0, discount_percent: 0, discount_amount: 0,
      tax_percent: 0, tax_amount: 0, inclusions: '', exclusions: '', terms_conditions: '', validity_days: 15
    });
    setShowModal(true);
  };

  const handleTourSelect = (packageId) => {
    const tour = tours.find(t => t.id == packageId);
    if (tour) {
      setForm(f => ({
        ...f, package_id: packageId, destination: tour.destination,
        duration_days: tour.duration_days, subtotal: tour.selling_price,
        inclusions: tour.inclusions || '', exclusions: tour.exclusions || '',
        terms_conditions: tour.terms_conditions || ''
      }));
    }
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(form.subtotal) || 0;
    const discount = parseFloat(form.discount_amount) || 0;
    const tax = parseFloat(form.tax_amount) || 0;
    return subtotal - discount + tax;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/quotations', form);
      setShowModal(false);
      fetchQuotations();
    } catch (err) { alert(err.response?.data?.error || 'Failed to create'); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/quotations/${id}/status`, { status });
    fetchQuotations();
  };

  const deleteQuotation = async (id) => {
    if (!confirm('Delete this quotation?')) return;
    await api.delete(`/quotations/${id}`);
    fetchQuotations();
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
  const statusBadge = (s) => {
    const map = { draft: 'warning', sent: 'primary', accepted: 'success', rejected: 'danger' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Quotation Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Quotation</button>
      </div>

      <div className="filter-bar">
        <input placeholder="Search..." value={filters.search} onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPagination({ ...pagination, page: 1 }); }} />
        <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPagination({ ...pagination, page: 1 }); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading"><div className="spinner" /></div> :
          quotations.length === 0 ? <div className="empty-state"><h3>No quotations found</h3></div> : (
          <table><thead><tr><th>Quotation #</th><th>Customer</th><th>Destination</th><th>Travelers</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{quotations.map(q => (
              <tr key={q.id}>
                <td><strong>{q.quotation_number}</strong></td>
                <td>{q.customer_name || q.lead_name || '-'}</td>
                <td>{q.destination || '-'}</td>
                <td>{q.travelers}</td>
                <td>{formatCurrency(q.subtotal)}</td>
                <td>{formatCurrency(q.discount_amount)}</td>
                <td>{formatCurrency(q.tax_amount)}</td>
                <td><strong>{formatCurrency(q.total)}</strong></td>
                <td>{statusBadge(q.status)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {q.status === 'accepted' && <button className="btn btn-sm btn-success" onClick={() => navigate('/bookings', { state: { quotationId: q.id, customerId: q.customer_id, packageId: q.package_id, total: q.total } })}>Create Booking</button>}
                    <select value={q.status} onChange={(e) => updateStatus(q.id, e.target.value)} style={{ padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--gray-300)' }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteQuotation(q.id)}>Del</button>
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
            <div className="modal-header"><h2>New Quotation</h2><button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group"><label>Lead</label><select className="form-control" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}><option value="">Select Lead</option>{leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>)}</select></div>
                  <div className="form-group"><label>Customer</label><select className="form-control" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">Select Customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="form-group"><label>Tour Package</label><select className="form-control" value={form.package_id} onChange={(e) => handleTourSelect(e.target.value)}><option value="">Select Package</option>{tours.map(t => <option key={t.id} value={t.id}>{t.name} ({t.destination})</option>)}</select></div>
                  <div className="form-group"><label>Destination</label><input className="form-control" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                  <div className="form-group"><label>Travel Date</label><input type="date" className="form-control" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} /></div>
                  <div className="form-group"><label>Travelers</label><input type="number" className="form-control" value={form.travelers} onChange={(e) => setForm({ ...form, travelers: parseInt(e.target.value) })} /></div>
                  <div className="form-group"><label>Duration (Days)</label><input type="number" className="form-control" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
                  <div className="form-group"><label>Validity (Days)</label><input type="number" className="form-control" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: parseInt(e.target.value) })} /></div>
                </div>
                <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>Pricing</h4>
                <div className="grid-3">
                  <div className="form-group"><label>Subtotal</label><input type="number" className="form-control" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: parseFloat(e.target.value) })} /></div>
                  <div className="form-group"><label>Discount (%)</label><input type="number" className="form-control" value={form.discount_percent} onChange={(e) => { const pct = parseFloat(e.target.value) || 0; const amt = (form.subtotal * pct) / 100; setForm({ ...form, discount_percent: pct, discount_amount: amt }); }} /></div>
                  <div className="form-group"><label>Discount Amount</label><input type="number" className="form-control" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: parseFloat(e.target.value) || 0, discount_percent: 0 })} /></div>
                  <div className="form-group"><label>Tax (%)</label><input type="number" className="form-control" value={form.tax_percent} onChange={(e) => { const pct = parseFloat(e.target.value) || 0; const amt = ((parseFloat(form.subtotal) || 0) * pct) / 100; setForm({ ...form, tax_percent: pct, tax_amount: amt }); }} /></div>
                  <div className="form-group"><label>Tax Amount</label><input type="number" className="form-control" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: parseFloat(e.target.value) || 0, tax_percent: 0 })} /></div>
                  <div className="form-group"><label>Total</label><input className="form-control" value={formatCurrency(calculateTotal())} disabled style={{ fontWeight: 700, color: 'var(--primary)' }} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label>Inclusions</label><textarea className="form-control" value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} /></div>
                  <div className="form-group"><label>Exclusions</label><textarea className="form-control" value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Terms & Conditions</label><textarea className="form-control" value={form.terms_conditions} onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
