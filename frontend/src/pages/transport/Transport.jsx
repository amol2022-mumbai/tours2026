import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';

export default function Transport() {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/transport');
      setTransports(res.data.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transport records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransport(); }, []);

  if (loading) return <LoadingSpinner fullPage text="Loading transport..." />;
  if (error) return <div className="page-container"><Alert type="error" onClose={() => fetchTransport()}>{error}</Alert></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Transport</h1>
        <button className="btn btn-primary">Add Transport</button>
      </div>

      {transports.length === 0 ? (
        <EmptyState title="No transport records yet" message="Flight, train, and bus bookings will appear here" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Provider</th>
              <th>Route</th>
              <th>Date</th>
              <th>Booking</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transports.map((t) => (
              <tr key={t.id}>
                <td><Badge color="gray">{t.transport_type || '-'}</Badge></td>
                <td><strong>{t.provider_name || '-'}</strong></td>
                <td>{t.route_from && t.route_to ? `${t.route_from} - ${t.route_to}` : '-'}</td>
                <td>{t.travel_date ? t.travel_date.slice(0, 10) : '-'}</td>
                <td><Badge color="gray">{t.booking_ref || '-'}</Badge></td>
                <td><Badge color={t.status === 'confirmed' ? 'success' : 'warning'}>{t.status || '-'}</Badge></td>
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
