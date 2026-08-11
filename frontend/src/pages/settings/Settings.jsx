import { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Alert from '../../components/ui/Alert';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [company, setCompany] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    gstin: '',
  });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    if (activeTab === 'company') fetchSettings();
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/settings');
      const data = res.data.data || res.data || {};
      setCompany((prev) => ({ ...prev, ...data }));
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccess('');
    setError('');
    try {
      await api.put('/api/settings', company);
      setSuccess('Settings saved successfully');
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setSaveLoading(true);
    setSuccess('');
    setError('');
    try {
      await api.put('/api/settings/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setSuccess('Password updated successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Loading settings..." />;

  const tabs = [
    { key: 'company', label: 'Company Details' },
    { key: 'password', label: 'Change Password' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {(success || error) && (
        <Alert type={success ? 'success' : 'error'} onClose={() => { setSuccess(''); setError(''); }}>
          {success || error}
        </Alert>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <Card title="Company Details">
          <form onSubmit={handleCompanySave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label>Company Name</label>
                <input className="form-control" value={company.name} onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={company.phone} onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-control" value={company.email} onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input className="form-control" value={company.website} onChange={(e) => setCompany((p) => ({ ...p, website: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>GSTIN</label>
                <input className="form-control" value={company.gstin} onChange={(e) => setCompany((p) => ({ ...p, gstin: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea className="form-control" rows={2} value={company.address} onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saveLoading} style={{ alignSelf: 'flex-start' }}>
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card title="Change Password">
          <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
            <div className="form-group">
              <label>Current Password</label>
              <input className="form-control" type="password" name="current_password" value={passwordData.current_password} onChange={handlePasswordChange} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input className="form-control" type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="form-control" type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saveLoading} style={{ alignSelf: 'flex-start' }}>
              {saveLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
