import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';

export default function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/hotels');
      setHotels(res.data.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHotels(); }, []);

  if (loading) return <LoadingSpinner fullPage text="Loading hotels..." />;
  if (error) return <div className="page-container"><Alert type="error" onClose={() => fetchHotels()}>{error}</Alert></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Hotels</h1>
        <button className="btn btn-primary">Add Hotel</button>
      </div>

      {hotels.length === 0 ? (
        <EmptyState title="No hotels yet" message="Hotel accommodations will appear here" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Star Rating</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.id}>
                <td><strong>{h.name}</strong></td>
                <td>{h.city || '-'}</td>
                <td><Badge color="gray">{h.star_rating || '-'} Star</Badge></td>
                <td>{h.contact_number || '-'}</td>
                <td><Badge color={h.status === 'active' ? 'success' : 'gray'}>{h.status || '-'}</Badge></td>
                <td>
                  <button className="btn btn-sm btn-secondary">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
