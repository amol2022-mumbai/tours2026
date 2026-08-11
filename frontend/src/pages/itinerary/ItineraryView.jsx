import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ItineraryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState([]);
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDay, setEditDay] = useState(null);
  const [form, setForm] = useState({ day_number: 1, title: '', description: '', places_to_visit: '', activities: '', hotel_name: '', hotel_details: '', transport_name: '', transport_details: '', meals: '' });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [tRes, iRes] = await Promise.all([
        api.get(`/tours/${id}`),
        api.get(`/itinerary/package/${id}`)
      ]);
      setTour(tRes.data);
      setDays(iRes.data);
    } catch (err) {
      alert('Failed to load data');
    } finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditDay(null);
    setForm({ day_number: days.length + 1, title: '', description: '', places_to_visit: '', activities: '', hotel_name: '', hotel_details: '', transport_name: '', transport_details: '', meals: '' });
    setShowModal(true);
  };

  const openEdit = (day) => {
    setEditDay(day);
    setForm({
      day_number: day.day_number || '', title: day.title || '', description: day.description || '',
      places_to_visit: day.places_to_visit || '', activities: day.activities || '',
      hotel_name: day.hotel_name || '', hotel_details: day.hotel_details || '',
      transport_name: day.transport_name || '', transport_details: day.transport_details || '', meals: day.meals || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDay) await api.put(`/itinerary/${editDay.id}`, form);
      else await api.post(`/itinerary/package/${id}`, form);
      setShowModal(false);
      loadData();
    } catch (err) { alert('Failed to save'); }
  };

  const deleteDay = async (dayId) => {
    if (!confirm('Delete this day?')) return;
    await api.delete(`/itinerary/${dayId}`);
    loadData();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{tour?.name} - Itinerary</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/tours/${id}`)}>Back</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Day</button>
        </div>
      </div>

      <div className="card">
        {days.length === 0 ? (
          <div className="empty-state"><h3>No itinerary days</h3><p>Add day-wise itinerary for this tour package</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {days.sort((a, b) => a.day_number - b.day_number).map(day => (
              <div key={day.id} className="card" style={{ border: '1px solid var(--primary-light)', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ color: 'var(--primary)' }}>Day {day.day_number}: {day.title || 'Untitled'}</h3>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(day)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteDay(day.id)}>Delete</button>
                  </div>
                </div>
                {day.description && <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}>{day.description}</p>}
                <div className="grid-2">
                  {day.places_to_visit && <div><strong style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Places to Visit</strong><p style={{ fontSize: '0.85rem' }}>{day.places_to_visit}</p></div>}
                  {day.activities && <div><strong style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Activities</strong><p style={{ fontSize: '0.85rem' }}>{day.activities}</p></div>}
                </div>
                <div className="grid-2" style={{ marginTop: '8px' }}>
                  {day.hotel_name && <div><strong style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Hotel</strong><p style={{ fontSize: '0.85rem' }}>{day.hotel_name} {day.hotel_details && `- ${day.hotel_details}`}</p></div>}
                  {day.transport_name && <div><strong style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Transport</strong><p style={{ fontSize: '0.85rem' }}>{day.transport_name} {day.transport_details && `- ${day.transport_details}`}</p></div>}
                </div>
                {day.meals && <div style={{ marginTop: '8px' }}><strong style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Meals</strong><p style={{ fontSize: '0.85rem' }}>{day.meals}</p></div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header"><h2>{editDay ? 'Edit' : 'Add'} Itinerary Day</h2><button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group"><label>Day Number *</label><input type="number" className="form-control" value={form.day_number} onChange={(e) => setForm({ ...form, day_number: parseInt(e.target.value) })} required /></div>
                  <div className="form-group"><label>Title</label><input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid-2">
                  <div className="form-group"><label>Places to Visit</label><textarea className="form-control" value={form.places_to_visit} onChange={(e) => setForm({ ...form, places_to_visit: e.target.value })} /></div>
                  <div className="form-group"><label>Activities</label><textarea className="form-control" value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Hotel Name</label><input className="form-control" value={form.hotel_name} onChange={(e) => setForm({ ...form, hotel_name: e.target.value })} />
                    <label style={{ marginTop: '8px' }}>Hotel Details</label><input className="form-control" value={form.hotel_details} onChange={(e) => setForm({ ...form, hotel_details: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Transport</label><input className="form-control" value={form.transport_name} onChange={(e) => setForm({ ...form, transport_name: e.target.value })} />
                    <label style={{ marginTop: '8px' }}>Transport Details</label><input className="form-control" value={form.transport_details} onChange={(e) => setForm({ ...form, transport_details: e.target.value })} />
                  </div>
                </div>
                <div className="form-group"><label>Meals</label><input className="form-control" value={form.meals} onChange={(e) => setForm({ ...form, meals: e.target.value })} placeholder="Breakfast, Lunch, Dinner" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editDay ? 'Update' : 'Add'} Day</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
