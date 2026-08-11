import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function TourDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tours/${id}`).then(({ data }) => setTour(data)).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!tour) return <div className="page-container"><div className="alert alert-error">Tour not found</div></div>;

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{tour.name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/tours')}>Back</button>
          <button className="btn btn-primary" onClick={() => navigate(`/tours/${id}/itinerary`)}>Manage Itinerary</button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header"><h3>Package Details</h3></div>
          <div className="detail-grid">
            <div className="detail-item"><label>Destination</label><span>{tour.destination}{tour.country ? `, ${tour.country}` : ''}</span></div>
            <div className="detail-item"><label>Duration</label><span>{tour.duration_days} Days / {tour.duration_nights} Nights</span></div>
            <div className="detail-item"><label>Cost</label><span>{formatCurrency(tour.cost)}</span></div>
            <div className="detail-item"><label>Selling Price</label><span>{formatCurrency(tour.selling_price)}</span></div>
            <div className="detail-item"><label>Margin</label><span style={{ color: (tour.selling_price - tour.cost) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(tour.selling_price - tour.cost)}</span></div>
            <div className="detail-item"><label>Status</label><span className={`badge badge-${tour.status === 'active' ? 'success' : 'danger'}`}>{tour.status}</span></div>
          </div>
          {tour.description && <div style={{ marginTop: '12px' }}><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)' }}>Description</label><p>{tour.description}</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><h3>Itinerary Summary</h3></div>
          {tour.itinerary && tour.itinerary.length > 0 ? (
            tour.itinerary.map((day, idx) => (
              <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <strong>Day {day.day_number}: {day.title || 'Untitled'}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '4px' }}>{day.description || 'No description'}</p>
                {day.hotel_name && <small style={{ color: 'var(--gray-500)' }}>Hotel: {day.hotel_name}</small>}
              </div>
            ))
          ) : <div className="empty-state"><h3>No itinerary added</h3></div>}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header"><h3>Inclusions</h3></div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{tour.inclusions || 'Not specified'}</pre>
        </div>
        <div className="card">
          <div className="card-header"><h3>Exclusions</h3></div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{tour.exclusions || 'Not specified'}</pre>
        </div>
      </div>

      {tour.recentBookings && tour.recentBookings.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Recent Bookings</h3></div>
          <table><thead><tr><th>Booking ID</th><th>Customer</th><th>Travel Date</th><th>Status</th></tr></thead>
            <tbody>{tour.recentBookings.map(b => (
              <tr key={b.booking_id}>
                <td>{b.booking_id}</td><td>{b.customer_name}</td>
                <td>{new Date(b.travel_start_date).toLocaleDateString()}</td>
                <td><span className={`badge badge-${b.status === 'confirmed' ? 'success' : 'warning'}`}>{b.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
