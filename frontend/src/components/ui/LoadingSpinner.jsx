import React from 'react';

export default function LoadingSpinner({ text = 'Loading...', fullPage = false }) {
  if (fullPage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{text}</span>
      </div>
    );
  }
  return (
    <div className="loading" style={{ flexDirection: 'column', gap: 8 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{text}</span>
    </div>
  );
}
