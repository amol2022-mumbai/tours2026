import client from './client';

export const toursApi = {
  list: (params = {}) => client.get('/tours', { params }),
  getById: (id) => client.get(`/tours/${id}`),
  create: (data) => client.post('/tours', data),
  update: (id, data) => client.put(`/tours/${id}`, data),
  remove: (id) => client.delete(`/tours/${id}`),
};
