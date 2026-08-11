import { useState, useEffect } from 'react';
import api from '../../services/api';

const ROLES = ['admin', 'manager', 'sales', 'accounts', 'operations'];

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  role: 'sales',
  password: '',
  status: 'active',
};

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/staff');
      setUsers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'sales',
      password: '',
      status: user.status || 'active',
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/api/staff/${editing.id}`, payload);
      } else {
        await api.post('/api/staff', form);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to save staff:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.put(`/api/staff/${deleteConfirm.id}/deactivate`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      console.error('Failed to deactivate staff:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Staff Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>Add Staff</button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No staff members found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email || '-'}</td>
                <td>{u.phone || '-'}</td>
                <td><span className="badge">{u.role}</span></td>
                <td><span className={`status-badge ${u.status === 'active' ? 'active' : 'inactive'}`}>{u.status}</span></td>
                <td className="actions">
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Edit</button>
                  {u.status === 'active' && (
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(u)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Staff' : 'Add Staff'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" value={form.role} onChange={handleChange}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {!editing && (
                  <div className="form-group">
                    <label>Password *</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} required />
                  </div>
                )}
                {editing && (
                  <div className="form-group">
                    <label>Password (leave blank to keep current)</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} />
                  </div>
                )}
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deactivation</h3>
              <button className="btn-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <p>Are you sure you want to deactivate <strong>{deleteConfirm.name}</strong>?</p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
