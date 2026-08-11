import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    api.get(`/customers/${id}`).then(({ data }) => setCustomer(data)).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!customer) return <div className="page-container"><div className="alert alert-error">Customer not found</div></div>;

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{customer.name}</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/customers')}>Back to Customers</button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>Details</button>
        <button className={`tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>Bookings ({customer.bookings?.length || 0})</button>
        <button className={`tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Payments ({customer.payments?.length || 0})</button>
        <button className={`tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Documents ({customer.documents?.length || 0})</button>
      </div>

      {tab === 'details' && (
        <div className="card">
          <div className="detail-grid">
            <div className="detail-item"><label>Name</label><span>{customer.name}</span></div>
            <div className="detail-item"><label>Email</label><span>{customer.email || '-'}</span></div>
            <div className="detail-item"><label>Phone</label><span>{customer.phone}</span></div>
            <div className="detail-item"><label>City</label><span>{customer.city || '-'}</span></div>
            <div className="detail-item"><label>State</label><span>{customer.state || '-'}</span></div>
            <div className="detail-item"><label>Country</label><span>{customer.country || '-'}</span></div>
            <div className="detail-item"><label>Nationality</label><span>{customer.nationality || '-'}</span></div>
            <div className="detail-item"><label>DOB</label><span>{customer.date_of_birth ? new Date(customer.date_of_birth).toLocaleDateString() : '-'}</span></div>
            <div className="detail-item"><label>ID Proof</label><span>{customer.id_proof_type} {customer.id_proof_number}</span></div>
            <div className="detail-item"><label>Emergency Contact</label><span>{customer.emergency_contact_name} - {customer.emergency_contact_phone}</span></div>
            <div className="detail-item"><label>Total Bookings</label><span>{customer.total_bookings}</span></div>
            <div className="detail-item"><label>Total Spent</label><span>{formatCurrency(customer.total_spent)}</span></div>
            <div className="detail-item"><label>Outstanding</label><span style={{ color: customer.outstanding_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(customer.outstanding_amount)}</span></div>
          </div>
          {customer.address && <div style={{ marginTop: '12px' }}><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)' }}>Address</label><p>{customer.address}</p></div>}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card">
          {customer.bookings?.length > 0 ? (
            <table><thead><tr><th>Booking ID</th><th>Tour</th><th>Dates</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{customer.bookings.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bookings/${b.id}`)}>
                  <td><strong>{b.booking_id}</strong></td>
                  <td>{b.package_name || b.tour_name}</td>
                  <td>{b.travel_start_date ? new Date(b.travel_start_date).toLocaleDateString() : '-'} - {b.travel_end_date ? new Date(b.travel_end_date).toLocaleDateString() : '-'}</td>
                  <td>{formatCurrency(b.total_amount)}</td>
                  <td><span className={`badge badge-${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}`}>{b.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-state"><h3>No bookings</h3></div>}
        </div>
      )}

      {tab === 'payments' && (
        <div className="card">
          {customer.payments?.length > 0 ? (
            <table><thead><tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Type</th><th>Method</th></tr></thead>
              <tbody>{customer.payments.map(p => (
                <tr key={p.id}>
                  <td>{p.receipt_number || '-'}</td>
                  <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-gray">{p.payment_type}</span></td>
                  <td><span className="badge badge-gray">{p.payment_method}</span></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-state"><h3>No payments</h3></div>}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          {customer.documents?.length > 0 ? (
            <table><thead><tr><th>Title</th><th>Type</th><th>Date</th></tr></thead>
              <tbody>{customer.documents.map(d => (
                <tr key={d.id}>
                  <td>{d.title || d.file_name}</td>
                  <td><span className="badge badge-gray">{d.document_type}</span></td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-state"><h3>No documents</h3></div>}
        </div>
      )}
    </div>
  );
}
