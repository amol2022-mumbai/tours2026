import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';

export default function Followups() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFollowups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/followups');
      setFollowups(res.data.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFollowups(); }, []);

  if (loading) return <LoadingSpinner fullPage text="Loading follow-ups..." />;
  if (error) return <div className="page-container"><Alert type="error" onClose={() => fetchFollowups()}>{error}</Alert></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Follow-ups</h1>
        <button className="btn btn-primary">Add Follow-up</button>
      </div>

      {followups.length === 0 ? (
        <EmptyState title="No follow-ups scheduled" message="Customer follow-up tasks will appear here" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead / Customer</th>
              <th>Type</th>
              <th>Scheduled</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {followups.map((f) => (
              <tr key={f.id}>
                <td><strong>{f.lead_name || f.customer_name || '-'}</strong></td>
                <td><Badge color="gray">{f.followup_type || '-'}</Badge></td>
                <td>{f.scheduled_date ? f.scheduled_date.slice(0, 10) : '-'}</td>
                <td>{f.notes || '-'}</td>
                <td><Badge color={f.status === 'completed' ? 'success' : 'warning'}>{f.status || 'pending'}</Badge></td>
                <td>
                  <button className="btn btn-sm btn-success">Complete</button>
                  <button className="btn btn-sm btn-secondary">Reschedule</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
