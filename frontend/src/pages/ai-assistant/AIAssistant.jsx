import { useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const res = await api.post('/api/ai/assist', { prompt });
      setResponse(res.data.response || res.data.text || '');
    } catch {
      setResponse('AI assistant is not available yet. This feature is coming soon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>AI Assistant</h1>
      </div>

      <Card title="Ask the Assistant">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Ask about tour itineraries, pricing suggestions, customer insights..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
        {response && (
          <div style={{
            marginTop: 16, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius)',
            border: '1px solid var(--gray-200)', whiteSpace: 'pre-wrap', fontSize: '0.9rem'
          }}>
            {response}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 24 }}>
        <EmptyState title="AI-powered insights coming soon" message="The AI assistant will help with itinerary optimization, pricing recommendations, and customer analytics" />
      </div>
    </div>
  );
}
