import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Tours() {
  const [tours, setTours] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTour, setEditTour] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', destination: '', country: '', duration_days: 1, duration_nights: 0,
    description: '', highlights: '', inclusions: '', exclusions: '', terms_conditions: '',
    cost: 0, selling_price: 0, image_url: ''
  });

  useEffect(() => { fetchTours(); }, [pagination.page, search]);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tours', { params: { page: pagination.page, search, limit: 20 } });
      setTours(data.data);
      setPagination(data.pagination);
    } catch (err) { /*silent*/ } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditTour(null);
    setForm({ name: '', destination: '', country: '', duration_days: 1, duration_nights: 0, description: '', highlights: '', inclusions: '', exclusions: '', terms_conditions: '', cost: 0, selling_price: 0, image_url: '' });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditTour(t);
    setForm({
      name: t.name || '', destination: t.destination || '', country: t.country || '',
      duration_days: t.duration_days || 1, duration_nights: t.duration_nights || 0,
      description: t.description || '', highlights: t.highlights || '', inclusions: t.inclusions || '',
      exclusions: t.exclusions || '', terms_conditions: t.terms_conditions || '',
      cost: t.cost || 0, selling_price: t.selling_price || 0, image_url: t.image_url || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTour) await api.put(`/tours/${editTour.id}`, form);
      else await api.post('/tours', form);
      setShowModal(false);
      fetchTours();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
  };

  const deleteTour = async (id) => {
    if (!confirm('Delete this tour package?')) return;
    await api.delete(`/tours/${id}`);
    fetchTours();
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Tour & Package Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Package</button>
      </div>

      <div className="filter-bar">
        <input placeholder="Search tours..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination({ ...pagination, page: 1 }); }} />
      </div>

      <div className="card">
        {loading ? <div className="loading"><div className="spinner" /></div> :
          tours.length === 0 ? <div className="empty-state"><h3>No tour packages found</h3></div> : (
          <table>
            <thead><tr><th>Name</th><th>Destination</th><th>Duration</th><th>Cost</th><th>Selling Price</th><th>Margin</th><th>Bookings</th><th>Actions</th></tr></thead>
            <tbody>
              {tours.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.destination}{t.country ? `, ${t.country}` : ''}</td>
                  <td>{t.duration_days}D / {t.duration_nights}N</td>
                  <td>{formatCurrency(t.cost)}</td>
                  <td>{formatCurrency(t.selling_price)}</td>
                  <td style={{ color: (t.selling_price - t.cost) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(t.selling_price - t.cost)}</td>
                  <td>{t.booking_count || 0}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/tours/${t.id}`)}>View</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn btn-sm btn-primary" onClick={() => navigate(`/tours/${t.id}/itinerary`)}>Itinerary</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteTour(t.id)}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header"><h2>{editTour ? 'Edit' : 'New'} Tour Package</h2><button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group"><label>Package Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="form-group"><label>Destination *</label><input className="form-control" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required /></div>
                  <div className="form-group"><label>Country</label><input className="form-control" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                  <div className="form-group">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}><label>Days</label><input type="number" className="form-control" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) })} /></div>
                      <div style={{ flex: 1 }}><label>Nights</label><input type="number" className="form-control" value={form.duration_nights} onChange={(e) => setForm({ ...form, duration_nights: parseInt(e.target.value) })} /></div>
                    </div>
                  </div>
                  <div className="form-group"><label>Cost</label><input type="number" className="form-control" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) })} /></div>
                  <div className="form-group"><label>Selling Price</label><input type="number" className="form-control" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="form-group"><label>Inclusions</label><textarea className="form-control" value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} placeholder="Accommodation, Meals, Transfers, etc." /></div>
                <div className="form-group"><label>Exclusions</label><textarea className="form-control" value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} placeholder="Airfare, Personal expenses, etc." /></div>
                <div className="form-group"><label>Terms & Conditions</label><textarea className="form-control" value={form.terms_conditions} onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editTour ? 'Update' : 'Create'} Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
