import client from './client';

export const bookingsApi = {
  list: (params = {}) => client.get('/bookings', { params }),
  getById: (id) => client.get(`/bookings/${id}`),
  create: (data) => client.post('/bookings', data),
  update: (id, data) => client.put(`/bookings/${id}`, data),
  updateStatus: (id, status) => client.put(`/bookings/${id}/status`, { status }),
  remove: (id) => client.delete(`/bookings/${id}`),
};
