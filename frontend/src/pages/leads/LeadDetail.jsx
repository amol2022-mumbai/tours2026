import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followupForm, setFollowupForm] = useState({ followup_date: '', followup_time: '', notes: '' });

  useEffect(() => { fetchLead(); }, [id]);

  const fetchLead = async () => {
    try {
      const { data } = await api.get(`/leads/${id}`);
      setLead(data);
    } catch (err) {
      alert('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const addFollowup = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/leads/${id}/followups`, followupForm);
      setFollowupForm({ followup_date: '', followup_time: '', notes: '' });
      fetchLead();
    } catch (err) {
      alert('Failed to add followup');
    }
  };

  const updateFollowupStatus = async (fid, status) => {
    await api.put(`/leads/followups/${fid}`, { status });
    fetchLead();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!lead) return <div className="page-container"><div className="alert alert-error">Lead not found</div></div>;

  const statusBadge = (s) => {
    const map = { new: 'info', quotation: 'primary', followup: 'warning', confirmed: 'success', lost: 'danger' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Lead: {lead.name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/leads')}>Back to Leads</button>
          {lead.status !== 'confirmed' && (
            <button className="btn btn-primary" onClick={() => navigate('/quotations', { state: { leadId: lead.id } })}>Create Quotation</button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header"><h3>Lead Details</h3> {statusBadge(lead.status)}</div>
          <div className="detail-grid">
            <div className="detail-item"><label>Name</label><span>{lead.name}</span></div>
            <div className="detail-item"><label>Phone</label><span>{lead.phone}</span></div>
            <div className="detail-item"><label>Email</label><span>{lead.email || '-'}</span></div>
            <div className="detail-item"><label>Destination</label><span>{lead.destination || '-'}</span></div>
            <div className="detail-item"><label>Travel Date</label><span>{lead.travel_date ? new Date(lead.travel_date).toLocaleDateString() : '-'}</span></div>
            <div className="detail-item"><label>Travelers</label><span>{lead.travelers}</span></div>
            <div className="detail-item"><label>Budget</label><span>{lead.budget ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(lead.budget) : '-'}</span></div>
            <div className="detail-item"><label>Source</label><span className="badge badge-gray">{lead.lead_source}</span></div>
            <div className="detail-item"><label>Assigned To</label><span>{lead.assigned_to_name || '-'}</span></div>
          </div>
          {lead.requirements && <div style={{ marginTop: '12px' }}><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Requirements</label><p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{lead.requirements}</p></div>}
          {lead.notes && <div style={{ marginTop: '12px' }}><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Notes</label><p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{lead.notes}</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><h3>Follow-ups</h3></div>
          <form onSubmit={addFollowup} style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input type="date" className="form-control" style={{ flex: '1 1 140px', minWidth: '120px' }} value={followupForm.followup_date} onChange={(e) => setFollowupForm({ ...followupForm, followup_date: e.target.value })} required />
            <input type="time" className="form-control" style={{ flex: '1 1 110px', minWidth: '100px' }} value={followupForm.followup_time} onChange={(e) => setFollowupForm({ ...followupForm, followup_time: e.target.value })} />
            <input className="form-control" style={{ flex: '3 1 140px', minWidth: '120px' }} placeholder="Notes" value={followupForm.notes} onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })} />
            <button type="submit" className="btn btn-primary btn-sm">Add</button>
          </form>

          {lead.followups && lead.followups.length > 0 ? (
            lead.followups.map(f => (
              <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(f.followup_date).toLocaleDateString()} {f.followup_time || ''}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{f.notes || 'No notes'}</div>
                  <div style={{ fontSize: '0.75rem' }}><span className={`badge badge-${f.status === 'done' ? 'success' : f.status === 'missed' ? 'danger' : 'warning'}`}>{f.status}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {f.status === 'pending' && (
                    <>
                      <button className="btn btn-sm btn-success" onClick={() => updateFollowupStatus(f.id, 'done')}>Done</button>
                      <button className="btn btn-sm btn-danger" onClick={() => updateFollowupStatus(f.id, 'missed')}>Missed</button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : <div className="empty-state"><h3>No follow-ups</h3></div>}
        </div>
      </div>

      {lead.quotations && lead.quotations.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Quotations</h3></div>
          <table><thead><tr><th>Quotation #</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {lead.quotations.map(q => (
                <tr key={q.id}>
                  <td><strong>{q.quotation_number}</strong></td>
                  <td>{new Date(q.created_at).toLocaleDateString()}</td>
                  <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(q.total)}</td>
                  <td><span className={`badge badge-${q.status === 'accepted' ? 'success' : q.status === 'rejected' ? 'danger' : q.status === 'sent' ? 'primary' : 'warning'}`}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
