import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STATUSES = ['new', 'quotation', 'followup', 'confirmed', 'lost'];
const SOURCES = ['facebook', 'instagram', 'google', 'whatsapp', 'referral', 'walkin', 'website', 'other'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', source: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', destination: '', travel_date: '',
    travelers: 1, budget: '', requirements: '', lead_source: 'other', notes: ''
  });

  useEffect(() => { fetchLeads(); }, [filters, pagination.page]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/leads', { params });
      setLeads(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditLead(null);
    setForm({ name: '', email: '', phone: '', destination: '', travel_date: '', travelers: 1, budget: '', requirements: '', lead_source: 'other', notes: '' });
    setShowModal(true);
  };

  const openEdit = (lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name || '', email: lead.email || '', phone: lead.phone || '',
      destination: lead.destination || '', travel_date: lead.travel_date ? lead.travel_date.split('T')[0] : '',
      travelers: lead.travelers || 1, budget: lead.budget || '', requirements: lead.requirements || '',
      lead_source: lead.lead_source || 'other', notes: lead.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editLead) {
        await api.put(`/leads/${editLead.id}`, form);
      } else {
        await api.post('/leads', form);
      }
      setShowModal(false);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save lead');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/leads/${id}`, { status });
      fetchLeads();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      fetchLeads();
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  const statusBadge = (s) => {
    const map = { new: 'info', quotation: 'primary', followup: 'warning', confirmed: 'success', lost: 'danger' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  const formatCurrency = (v) => v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : '-';

  if (loading && leads.length === 0) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Lead / Enquiry Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Lead</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        <input placeholder="Search leads..." value={filters.search} onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPagination({ ...pagination, page: 1 }); }} />
        <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPagination({ ...pagination, page: 1 }); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => { setFilters({ ...filters, source: e.target.value }); setPagination({ ...pagination, page: 1 }); }}>
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {leads.length === 0 ? (
          <div className="empty-state"><h3>No leads found</h3><p>Create a new lead to get started</p></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Destination</th><th>Travel Date</th><th>Budget</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id}>
                  <td><a href="#" onClick={(e) => { e.preventDefault(); navigate(`/leads/${l.id}`); }} style={{ fontWeight: 500 }}>{l.name}</a></td>
                  <td>{l.phone}</td>
                  <td>{l.destination || '-'}</td>
                  <td>{l.travel_date ? new Date(l.travel_date).toLocaleDateString() : '-'}</td>
                  <td>{formatCurrency(l.budget)}</td>
                  <td><span className="badge badge-gray">{l.lead_source}</span></td>
                  <td>{statusBadge(l.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(l)}>Edit</button>
                      <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)} style={{ padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--gray-300)' }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteLead(l.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editLead ? 'Edit Lead' : 'New Lead'}</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>X</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="form-group"><label>Phone *</label><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                  <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="form-group"><label>Destination</label><input className="form-control" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                  <div className="form-group"><label>Travel Date</label><input type="date" className="form-control" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} /></div>
                  <div className="form-group"><label>Travelers</label><input type="number" className="form-control" value={form.travelers} onChange={(e) => setForm({ ...form, travelers: parseInt(e.target.value) })} /></div>
                  <div className="form-group"><label>Budget</label><input type="number" className="form-control" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
                  <div className="form-group"><label>Lead Source</label><select className="form-control" value={form.lead_source} onChange={(e) => setForm({ ...form, lead_source: e.target.value })}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                </div>
                <div className="form-group"><label>Requirements</label><textarea className="form-control" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></div>
                <div className="form-group"><label>Notes</label><textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editLead ? 'Update' : 'Create'} Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
