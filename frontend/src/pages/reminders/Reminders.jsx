import { useState, useEffect } from 'react';
import api from '../../services/api';

const REMINDER_TYPES = ['followup', 'payment', 'document', 'travel', 'hotel_confirmation', 'supplier_payment', 'feedback'];

const INITIAL_FORM = {
  reminder_type: 'followup',
  reference_type: '',
  reference_id: '',
  reminder_date: '',
  message: '',
};

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/api/reminders', { params });
      setReminders(res.data.data || res.data);
      setPagination((p) => ({ ...p, total: res.data.total || res.data.pagination?.total || 0 }));
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get('/api/reminders/pending');
      const pending = res.data.data || res.data || [];
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Failed to fetch pending reminders:', err);
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchPending();
  }, [pagination.page, filters]);

  const openCreate = () => {
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/reminders', form);
      setModalOpen(false);
      fetchReminders();
      fetchPending();
    } catch (err) {
      console.error('Failed to create reminder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reminder, status) => {
    try {
      await api.put(`/api/reminders/${reminder.id}`, { status });
      fetchReminders();
      fetchPending();
    } catch (err) {
      console.error('Failed to update reminder status:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/reminders/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchReminders();
      fetchPending();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Reminders</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {pendingCount > 0 && (
            <span className="badge badge-warning">{pendingCount} pending</span>
          )}
          <button className="btn btn-primary" onClick={openCreate}>Add Reminder</button>
        </div>
      </div>

      <div className="filters">
        <select value={filters.type} onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Types</option>
          {REMINDER_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="done">Done</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : reminders.length === 0 ? (
        <div className="empty-state">No reminders found.</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Message</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((r) => (
                <tr key={r.id} className={r.status === 'pending' ? 'row-pending' : ''}>
                  <td>{r.reminder_date ? r.reminder_date.slice(0, 10) : '-'}</td>
                  <td><span className="badge">{r.reminder_type}</span></td>
                  <td>{r.reference_type && r.reference_id ? `${r.reference_type} #${r.reference_id}` : '-'}</td>
                  <td>{r.message || '-'}</td>
                  <td><span className={`status-badge ${r.status === 'pending' ? 'pending' : r.status === 'sent' ? 'active' : 'inactive'}`}>{r.status}</span></td>
                  <td className="actions">
                    {r.status === 'pending' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleUpdateStatus(r, 'sent')}>Mark Sent</button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(r, 'done')}>Mark Done</button>
                      </>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Prev</button>
              <span>Page {pagination.page} of {totalPages}</span>
              <button disabled={pagination.page >= totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Reminder</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Reminder Type</label>
                  <select name="reminder_type" value={form.reminder_type} onChange={handleChange}>
                    {REMINDER_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reminder Date *</label>
                  <input name="reminder_date" type="date" value={form.reminder_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Reference Type</label>
                  <input name="reference_type" value={form.reference_type} onChange={handleChange} placeholder="e.g. booking, invoice" />
                </div>
                <div className="form-group">
                  <label>Reference ID</label>
                  <input name="reference_id" value={form.reference_id} onChange={handleChange} />
                </div>
                <div className="form-group full-width">
                  <label>Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
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
              <h3>Confirm Delete</h3>
              <button className="btn-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <p>Are you sure you want to delete this reminder?</p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
