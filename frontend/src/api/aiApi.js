import client from './client';

export const aiApi = {
  assist: (prompt, conversationHistory = [], includeBusinessData = true) =>
    client.post('/ai/assist', { prompt, conversationHistory, includeBusinessData }),

  checkHealth: () =>
    client.get('/ai/health'),
};
