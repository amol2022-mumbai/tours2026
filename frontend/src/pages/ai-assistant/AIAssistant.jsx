import { useState, useRef, useEffect, useCallback } from 'react';
import { aiApi } from '../../api/aiApi';
import './AIAssistant.css';

const SUGGESTED_PROMPTS = [
  {
    icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    text: 'Summarize today\'s leads and pending follow-ups',
  },
  {
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    text: 'Create a 5-day Goa itinerary with activities',
  },
  {
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    text: 'Show customers with pending payments',
  },
  {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    text: 'Generate a quotation for a 3-day Kerala trip',
  },
  {
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    text: 'Create payment reminder messages for overdue bookings',
  },
  {
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    text: 'Analyze this month\'s booking and revenue performance',
  },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AIAssistant() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiAvailable, setAiAvailable] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    localStorage.setItem('ai_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    aiApi.checkHealth().catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setError('');
    inputRef.current?.focus();
  }, []);

  const createConversation = useCallback((firstMessage) => {
    const newConv = {
      id: generateId(),
      title: firstMessage.slice(0, 50),
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, []);

  const addMessage = useCallback((convId, message) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const updated = {
          ...c,
          messages: [...c.messages, message],
        };
        if (c.messages.length === 0 && message.role === 'user') {
          updated.title = message.content.slice(0, 50);
        }
        return updated;
      })
    );
  }, []);

  const deleteConversation = useCallback((convId) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeId === convId) {
      setActiveId(null);
      setError('');
    }
  }, [activeId]);

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveId(null);
    setError('');
  }, []);

  const copyMessage = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  const regenerateResponse = useCallback(async (convId) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv || conv.messages.length < 2) return;

    const userMessages = conv.messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (!lastUserMessage) return;

    const trimmedMessages = conv.messages.slice(0, -1);

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return { ...c, messages: trimmedMessages };
      })
    );

    setLoading(true);
    setError('');

    const historyForApi = trimmedMessages
      .filter((m) => m.content && m.content !== '...')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await aiApi.assist(lastUserMessage.content, historyForApi);
      const assistantMsg = {
        id: generateId(),
        role: 'assistant',
        content: res.data.response,
        timestamp: formatTime(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return { ...c, messages: [...c.messages, assistantMsg] };
        })
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get response. Please try again.');
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return { ...c, messages: [...c.messages, ...trimmedMessages.slice(-1)] };
        })
      );
    } finally {
      setLoading(false);
    }
  }, [conversations]);

  const handleSend = useCallback(async (text) => {
    const promptText = (typeof text === 'string' ? text : input).trim();
    if (!promptText || loading) return;

    setInput('');
    setError('');

    let convId = activeId;
    if (!convId) {
      convId = createConversation(promptText);
    }

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: promptText,
      timestamp: formatTime(),
    };

    addMessage(convId, userMsg);
    setLoading(true);

    const currentConv = conversations.find((c) => c.id === convId);
    const historyForApi = (currentConv?.messages || [])
      .filter((m) => m.content && m.content !== '...')
      .map((m) => ({ role: m.role, content: m.content }));

    historyForApi.push({ role: 'user', content: promptText });

    try {
      const res = await aiApi.assist(promptText, historyForApi);

      const assistantMsg = {
        id: generateId(),
        role: 'assistant',
        content: res.data.response,
        timestamp: formatTime(),
      };

      addMessage(convId, assistantMsg);
    } catch (err) {
      const errorContent = err.response?.data?.error || 'Failed to get response. Please try again.';
      setError(errorContent);

      const errorMsg = {
        id: generateId(),
        role: 'assistant',
        content: errorContent,
        timestamp: formatTime(),
        isError: true,
      };
      addMessage(convId, errorMsg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeId, conversations, createConversation, addMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (content) => {
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/^### (.*)/gm, '<h4>$1</h4>')
      .replace(/^## (.*)/gm, '<h3>$1</h3>')
      .replace(/^# (.*)/gm, '<h2>$1</h2>')
      .replace(/^\- (.*)/gm, '<li>$1</li>');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className="ai-assistant">
      <div className="ai-sidebar">
        <div className="ai-sidebar-header">
          <h3>Conversations</h3>
          <button className="ai-new-chat-btn" onClick={startNewChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
        </div>
        <div className="ai-sidebar-conversations">
          {conversations.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.82rem' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`ai-conversation-item ${conv.id === activeId ? 'active' : ''}`}
                onClick={() => { setActiveId(conv.id); setError(''); }}
              >
                <span className="ai-conversation-item-title">{conv.title || 'New conversation'}</span>
                <button
                  className="ai-conversation-item-delete"
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  title="Delete conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
        {conversations.length > 0 && (
          <div className="ai-sidebar-footer">
            <button className="ai-clear-all-btn" onClick={clearAllConversations}>Clear all conversations</button>
          </div>
        )}
      </div>

      <div className="ai-chat-area">
        <div className="ai-chat-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Assistant
            {!aiAvailable && <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 400 }}>(Not configured)</span>}
          </h2>
          <div className="ai-chat-header-actions">
            {activeId && (
              <button className="btn btn-sm btn-secondary" onClick={startNewChat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Chat
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="ai-error">
            <span>{error}</span>
            <button className="ai-error-retry" onClick={() => { setError(''); handleSend(input); }}>
              Retry
            </button>
          </div>
        )}

        <div className="ai-messages">
          {messages.length === 0 && !loading ? (
            <div className="ai-messages-empty">
              <div className="ai-messages-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3>How can I help you today?</h3>
              <p>Ask me about leads, itineraries, quotations, customer communication, or business analytics.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`ai-message ${msg.role}`}>
                <div className="ai-message-avatar">
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div>
                  <div
                    className="ai-message-content"
                    style={msg.isError ? { background: 'var(--danger-light)', border: '1px solid #fca5a5', color: 'var(--danger)' } : {}}
                  >
                    {renderMessageContent(msg.content)}
                  </div>
                  <div className="ai-message-time">{msg.timestamp}</div>
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="ai-message-actions">
                      <button onClick={() => copyMessage(msg.content)}>Copy</button>
                      <button onClick={() => regenerateResponse(activeId)}>Regenerate</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="ai-message assistant">
              <div className="ai-message-avatar">AI</div>
              <div className="ai-message-content">
                <div className="ai-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="ai-suggestions">
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              className="ai-suggestion-card"
              onClick={() => handleSend(prompt.text)}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={prompt.icon} />
              </svg>
              {prompt.text}
            </button>
          ))}
        </div>

        <form className="ai-input-area" onSubmit={handleSubmit}>
          <div className="ai-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiAvailable ? 'Ask anything about your tour business...' : 'AI assistant is not configured. Set AI_API_KEY to enable.'}
              rows={1}
              disabled={!aiAvailable || loading}
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={!input.trim() || loading || !aiAvailable}
              title="Send message"
            >
              {loading ? (
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
