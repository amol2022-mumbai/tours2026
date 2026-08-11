import { useState, useEffect } from 'react';
import api from '../../services/api';

const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const TABS = [
  { key: 'leads', label: 'Leads' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'stats', label: 'Stats' },
];

const INITIAL_LEAD_FORM = {
  source: '',
  campaign: '',
  lead_name: '',
  phone: '',
  ad_spend: '',
  impressions: '',
  clicks: '',
  converted: false,
};

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_LEAD_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/marketing/leads');
      setLeads(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/marketing/campaigns');
      setCampaigns(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/marketing/stats');
      setStats(res.data.data || res.data || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leads') fetchLeads();
    else if (activeTab === 'campaigns') fetchCampaigns();
    else if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_LEAD_FORM);
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({
      source: lead.source || '',
      campaign: lead.campaign || '',
      lead_name: lead.lead_name || '',
      phone: lead.phone || '',
      ad_spend: lead.ad_spend || '',
      impressions: lead.impressions || '',
      clicks: lead.clicks || '',
      converted: !!lead.converted,
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/api/marketing/leads/${editing.id}`, form);
      } else {
        await api.post('/api/marketing/leads', form);
      }
      setModalOpen(false);
      fetchLeads();
    } catch (err) {
      console.error('Failed to save lead:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/marketing/leads/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const renderLeads = () => (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openCreate}>Add Lead</button>
      </div>
      {leads.length === 0 ? (
        <div className="empty-state">No leads found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Campaign</th>
              <th>Lead Name</th>
              <th>Phone</th>
              <th>Ad Spend</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>Converted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>{l.source || '-'}</td>
                <td>{l.campaign || '-'}</td>
                <td>{l.lead_name || '-'}</td>
                <td>{l.phone || '-'}</td>
                <td>{formatCurrency(l.ad_spend)}</td>
                <td>{l.impressions ?? '-'}</td>
                <td>{l.clicks ?? '-'}</td>
                <td><span className={`status-badge ${l.converted ? 'active' : 'inactive'}`}>{l.converted ? 'Yes' : 'No'}</span></td>
                <td className="actions">
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(l)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(l)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Lead' : 'Add Lead'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Source</label>
                  <input name="source" value={form.source} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Campaign</label>
                  <input name="campaign" value={form.campaign} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Lead Name</label>
                  <input name="lead_name" value={form.lead_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Ad Spend</label>
                  <input name="ad_spend" type="number" step="0.01" value={form.ad_spend} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Impressions</label>
                  <input name="impressions" type="number" value={form.impressions} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Clicks</label>
                  <input name="clicks" type="number" value={form.clicks} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input name="converted" type="checkbox" checked={form.converted} onChange={handleChange} />
                    Converted
                  </label>
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
            <p>Are you sure you want to delete lead <strong>{deleteConfirm.lead_name}</strong>?</p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderCampaigns = () => (
    campaigns.length === 0 ? (
      <div className="empty-state">No campaigns found.</div>
    ) : (
      <table className="data-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Source</th>
            <th>Leads</th>
            <th>Ad Spend</th>
            <th>Impressions</th>
            <th>Clicks</th>
            <th>Converted</th>
            <th>Conversion Rate</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, idx) => (
            <tr key={idx}>
              <td>{c.campaign || '-'}</td>
              <td>{c.source || '-'}</td>
              <td>{c.leads ?? c.total_leads ?? '-'}</td>
              <td>{formatCurrency(c.ad_spend)}</td>
              <td>{c.impressions ?? '-'}</td>
              <td>{c.clicks ?? '-'}</td>
              <td>{c.converted ?? '-'}</td>
              <td>{c.conversion_rate != null ? `${Number(c.conversion_rate).toFixed(1)}%` : '-'}</td>
              <td>{formatCurrency(c.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  );

  const renderStats = () => {
    if (!stats) return <div className="empty-state">No stats found.</div>;

    const sourceStats = stats.source_stats || [];
    const revenueByCampaign = stats.revenue_by_campaign || [];

    return (
      <div>
        <h3>Source Stats</h3>
        {sourceStats.length === 0 ? (
          <div className="empty-state">No source stats found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Leads</th>
                <th>Converted</th>
                <th>Conversion Rate</th>
                <th>Ad Spend</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sourceStats.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.source || '-'}</td>
                  <td>{s.total_leads ?? '-'}</td>
                  <td>{s.converted ?? '-'}</td>
                  <td>{s.conversion_rate != null ? `${Number(s.conversion_rate).toFixed(1)}%` : '-'}</td>
                  <td>{formatCurrency(s.ad_spend)}</td>
                  <td>{formatCurrency(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{ marginTop: '2rem' }}>Revenue by Campaign</h3>
        {revenueByCampaign.length === 0 ? (
          <div className="empty-state">No campaign revenue data found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Revenue</th>
                <th>Bookings</th>
                <th>Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {revenueByCampaign.map((c, idx) => (
                <tr key={idx}>
                  <td>{c.campaign || '-'}</td>
                  <td>{formatCurrency(c.revenue)}</td>
                  <td>{c.bookings ?? '-'}</td>
                  <td>{formatCurrency(c.avg_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="loading">Loading...</div>;

    switch (activeTab) {
      case 'leads': return renderLeads();
      case 'campaigns': return renderCampaigns();
      case 'stats': return renderStats();
      default: return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Marketing</h2>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {renderContent()}
      </div>
    </div>
  );
}
