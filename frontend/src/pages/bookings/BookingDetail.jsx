import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_type: 'installment', payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0], transaction_id: '', notes: ''
  });

  useEffect(() => {
    api.get(`/bookings/${id}`).then(({ data }) => setBooking(data)).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        ...paymentForm,
        booking_id: booking.id,
        customer_id: booking.customer_id
      });
      setShowPayment(false);
      setPaymentForm({ amount: '', payment_type: 'installment', payment_method: 'bank_transfer', payment_date: new Date().toISOString().split('T')[0], transaction_id: '', notes: '' });
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data);
    } catch (err) { alert(err.response?.data?.error || 'Failed to add payment'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!booking) return <div className="page-container"><div className="alert alert-error">Booking not found</div></div>;

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
  const statusBadge = (s) => {
    const map = { pending: 'warning', confirmed: 'success', cancelled: 'danger', completed: 'info' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Booking: {booking.booking_id}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/bookings')}>Back</button>
          {booking.balance_amount > 0 && booking.status !== 'cancelled' && (
            <button className="btn btn-primary" onClick={() => setShowPayment(true)}>+ Add Payment</button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header"><h3>Booking Details</h3> {statusBadge(booking.status)}</div>
          <div className="detail-grid">
            <div className="detail-item"><label>Booking ID</label><span>{booking.booking_id}</span></div>
            <div className="detail-item"><label>Tour</label><span>{booking.package_name || booking.tour_name || '-'}</span></div>
            <div className="detail-item"><label>Destination</label><span>{booking.destination || '-'}</span></div>
            <div className="detail-item"><label>Travel Start</label><span>{booking.travel_start_date ? new Date(booking.travel_start_date).toLocaleDateString() : '-'}</span></div>
            <div className="detail-item"><label>Travel End</label><span>{booking.travel_end_date ? new Date(booking.travel_end_date).toLocaleDateString() : '-'}</span></div>
            <div className="detail-item"><label>Travelers</label><span>{booking.travelers}</span></div>
            <div className="detail-item"><label>Adults/Children/Infants</label><span>{booking.adult_count} / {booking.child_count} / {booking.infant_count}</span></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Financial Summary</h3></div>
          <div className="detail-grid">
            <div className="detail-item"><label>Total Amount</label><span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(booking.total_amount)}</span></div>
            <div className="detail-item"><label>Advance</label><span>{formatCurrency(booking.advance_amount)}</span></div>
            <div className="detail-item"><label>Paid</label><span style={{ color: 'var(--success)' }}>{formatCurrency(booking.paid_amount)}</span></div>
            <div className="detail-item"><label>Balance</label><span style={{ color: booking.balance_amount > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(booking.balance_amount)}</span></div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Customer Information</h3></div>
          {booking.customer_name ? (
            <div className="detail-grid">
              <div className="detail-item"><label>Name</label><span>{booking.customer_name}</span></div>
              <div className="detail-item"><label>Phone</label><span>{booking.customer_phone || '-'}</span></div>
              <div className="detail-item"><label>Email</label><span>{booking.customer_email || '-'}</span></div>
              <div className="detail-item"><label>Address</label><span>{booking.customer_address || '-'}</span></div>
            </div>
          ) : <div className="empty-state"><p>No customer linked</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><h3>Payment History</h3></div>
          {booking.payments && booking.payments.length > 0 ? (
            <table><thead><tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Type</th><th>Method</th></tr></thead>
              <tbody>{booking.payments.map(p => (
                <tr key={p.id}>
                  <td>{p.receipt_number || '-'}</td>
                  <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-gray">{p.payment_type}</span></td>
                  <td><span className="badge badge-gray">{p.payment_method}</span></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-state"><h3>No payments yet</h3></div>}
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header"><h2>Add Payment</h2><button className="btn btn-sm btn-secondary" onClick={() => setShowPayment(false)}>X</button></div>
            <form onSubmit={addPayment}>
              <div className="modal-body">
                <div className="form-group"><label>Amount *</label><input type="number" className="form-control" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required /></div>
                <div className="form-group"><label>Payment Type</label><select className="form-control" value={paymentForm.payment_type} onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}>
                  <option value="advance">Advance</option><option value="installment">Installment</option><option value="final">Final</option><option value="refund">Refund</option>
                </select></div>
                <div className="form-group"><label>Payment Method</label><select className="form-control" value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                  <option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="online">Online</option>
                </select></div>
                <div className="form-group"><label>Payment Date</label><input type="date" className="form-control" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></div>
                <div className="form-group"><label>Transaction ID</label><input className="form-control" value={paymentForm.transaction_id} onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })} /></div>
                <div className="form-group"><label>Notes</label><textarea className="form-control" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
