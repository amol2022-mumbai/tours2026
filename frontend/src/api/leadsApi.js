import client from './client';

export const leadsApi = {
  list: (params = {}) => client.get('/leads', { params }),
  getById: (id) => client.get(`/leads/${id}`),
  create: (data) => client.post('/leads', data),
  update: (id, data) => client.put(`/leads/${id}`, data),
  remove: (id) => client.delete(`/leads/${id}`),
  getFollowups: (leadId) => client.get(`/leads/${leadId}/followups`),
  createFollowup: (leadId, data) => client.post(`/leads/${leadId}/followups`, data),
  updateFollowup: (followupId, data) => client.put(`/leads/followups/${followupId}`, data),
};
