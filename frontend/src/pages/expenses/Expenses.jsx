import { useState, useEffect } from 'react';
import api from '../../services/api';

const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const EXPENSE_CATEGORIES = ['hotel', 'transport', 'tickets', 'food', 'guide', 'activities', 'staff', 'marketing', 'misc'];
const PAYMENT_STATUSES = ['pending', 'paid'];

const INITIAL_FORM = {
  category: 'hotel',
  description: '',
  amount: '',
  expense_date: '',
  payment_status: 'pending',
  booking_id: '',
  supplier_id: '',
  notes: '',
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category: '', date_from: '', date_to: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.category) params.category = filters.category;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await api.get('/api/expenses', { params });
      setExpenses(res.data.data || res.data);
      setPagination((p) => ({ ...p, total: res.data.total || res.data.pagination?.total || 0 }));
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [suppliersRes, bookingsRes] = await Promise.all([
        api.get('/api/suppliers', { params: { limit: 1000 } }),
        api.get('/api/bookings', { params: { limit: 1000 } }),
      ]);
      setSuppliers(suppliersRes.data.data || suppliersRes.data || []);
      setBookings(bookingsRes.data.data || bookingsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [pagination.page, filters]);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    fetchDropdownData();
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setForm({
      category: expense.category || 'hotel',
      description: expense.description || '',
      amount: expense.amount || '',
      expense_date: expense.expense_date ? expense.expense_date.slice(0, 10) : '',
      payment_status: expense.payment_status || 'pending',
      booking_id: expense.booking_id || '',
      supplier_id: expense.supplier_id || '',
      notes: expense.notes || '',
    });
    fetchDropdownData();
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
        await api.put(`/api/expenses/${editing.id}`, form);
      } else {
        await api.post('/api/expenses', form);
      }
      setModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to save expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/expenses/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Expenses</h2>
        <button className="btn btn-primary" onClick={openCreate}>Add Expense</button>
      </div>

      <div className="filters">
        <select value={filters.category} onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <input type="date" value={filters.date_from} onChange={(e) => { setFilters((f) => ({ ...f, date_from: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }} placeholder="From" />
        <input type="date" value={filters.date_to} onChange={(e) => { setFilters((f) => ({ ...f, date_to: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }} placeholder="To" />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">No expenses found.</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Supplier</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.expense_date ? e.expense_date.slice(0, 10) : '-'}</td>
                  <td><span className="badge">{e.category}</span></td>
                  <td>{e.description || '-'}</td>
                  <td>{formatCurrency(e.amount)}</td>
                  <td>{e.supplier?.name || '-'}</td>
                  <td><span className={`status-badge ${e.payment_status === 'paid' ? 'active' : 'pending'}`}>{e.payment_status}</span></td>
                  <td className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(e)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(e)}>Delete</button>
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
              <h3>{editing ? 'Edit Expense' : 'Add Expense'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input name="description" value={form.description} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Amount *</label>
                  <input name="amount" type="number" step="0.01" value={form.amount} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Expense Date *</label>
                  <input name="expense_date" type="date" value={form.expense_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select name="payment_status" value={form.payment_status} onChange={handleChange}>
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Booking</label>
                  <select name="booking_id" value={form.booking_id} onChange={handleChange}>
                    <option value="">None</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>{b.id} - {b.customer?.name || 'N/A'}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
                    <option value="">None</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} />
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
              <h3>Confirm Delete</h3>
              <button className="btn-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <p>Are you sure you want to delete this expense of <strong>{formatCurrency(deleteConfirm.amount)}</strong>?</p>
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
