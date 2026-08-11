import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', country: '',
    id_proof_type: '', id_proof_number: '', date_of_birth: '', nationality: '',
    emergency_contact_name: '', emergency_contact_phone: '', notes: ''
  });

  useEffect(() => { fetchCustomers(); }, [pagination.page, search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { page: pagination.page, search, limit: 20 } });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditCustomer(null);
    setForm({ name: '', email: '', phone: '', address: '', city: '', state: '', country: '', id_proof_type: '', id_proof_number: '', date_of_birth: '', nationality: '', emergency_contact_name: '', emergency_contact_phone: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '',
      city: c.city || '', state: c.state || '', country: c.country || '',
      id_proof_type: c.id_proof_type || '', id_proof_number: c.id_proof_number || '',
      date_of_birth: c.date_of_birth ? c.date_of_birth.split('T')[0] : '', nationality: c.nationality || '',
      emergency_contact_name: c.emergency_contact_name || '', emergency_contact_phone: c.emergency_contact_phone || '', notes: c.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const deleteCustomer = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await api.delete(`/customers/${id}`);
    fetchCustomers();
  };

  const formatCurrency = (v) => v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customer Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Customer</button>
      </div>

      <div className="filter-bar">
        <input placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination({ ...pagination, page: 1 }); }} />
      </div>

      <div className="card">
        {loading ? <div className="loading"><div className="spinner" /></div> :
          customers.length === 0 ? <div className="empty-state"><h3>No customers found</h3></div> : (
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Total Bookings</th><th>Total Spent</th><th>Actions</th></tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><a href="#" onClick={(e) => { e.preventDefault(); navigate(`/customers/${c.id}`); }} style={{ fontWeight: 500 }}>{c.name}</a></td>
                  <td>{c.phone}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.city || '-'}</td>
                  <td>{c.total_bookings || 0}</td>
                  <td>{formatCurrency(c.total_spent)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteCustomer(c.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header"><h2>{editCustomer ? 'Edit' : 'New'} Customer</h2><button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="form-group"><label>Phone *</label><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                  <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="form-group"><label>City</label><input className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="form-group"><label>State</label><input className="form-control" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                  <div className="form-group"><label>Country</label><input className="form-control" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                  <div className="form-group"><label>ID Proof Type</label><input className="form-control" value={form.id_proof_type} onChange={(e) => setForm({ ...form, id_proof_type: e.target.value })} /></div>
                  <div className="form-group"><label>ID Proof Number</label><input className="form-control" value={form.id_proof_number} onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })} /></div>
                  <div className="form-group"><label>Date of Birth</label><input type="date" className="form-control" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                  <div className="form-group"><label>Nationality</label><input className="form-control" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Address</label><textarea className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid-2">
                  <div className="form-group"><label>Emergency Contact</label><input className="form-control" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
                  <div className="form-group"><label>Emergency Phone</label><input className="form-control" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Notes</label><textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editCustomer ? 'Update' : 'Create'} Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
