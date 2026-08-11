import client from './client';

export const quotationsApi = {
  list: (params = {}) => client.get('/quotations', { params }),
  getById: (id) => client.get(`/quotations/${id}`),
  create: (data) => client.post('/quotations', data),
  update: (id, data) => client.put(`/quotations/${id}`, data),
  updateStatus: (id, status) => client.put(`/quotations/${id}/status`, { status }),
  remove: (id) => client.delete(`/quotations/${id}`),
};
