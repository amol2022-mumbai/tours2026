import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  getProfile: () => client.get('/auth/me'),
  updateProfile: (data) => client.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) =>
    client.put('/auth/change-password', { currentPassword, newPassword }),
};
