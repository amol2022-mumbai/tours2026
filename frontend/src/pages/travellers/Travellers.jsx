import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';

export default function Travellers() {
  const [travellers, setTravellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTravellers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/travellers');
      setTravellers(res.data.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load travellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTravellers(); }, []);

  if (loading) return <LoadingSpinner fullPage text="Loading travellers..." />;
  if (error) return <div className="page-container"><Alert type="error" onClose={() => fetchTravellers()}>{error}</Alert></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Travellers</h1>
        <button className="btn btn-primary">Add Traveller</button>
      </div>

      {travellers.length === 0 ? (
        <EmptyState title="No travellers yet" message="Travellers assigned to bookings will appear here" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Passport</th>
              <th>Nationality</th>
              <th>Date of Birth</th>
              <th>Booking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {travellers.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.first_name} {t.last_name}</strong></td>
                <td>{t.passport_no || '-'}</td>
                <td>{t.nationality || '-'}</td>
                <td>{t.date_of_birth ? t.date_of_birth.slice(0, 10) : '-'}</td>
                <td><Badge color="gray">{t.booking_ref || '-'}</Badge></td>
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
