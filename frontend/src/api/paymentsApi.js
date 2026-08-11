import client from './client';

export const paymentsApi = {
  list: (params = {}) => client.get('/payments', { params }),
  create: (data) => client.post('/payments', data),
};
