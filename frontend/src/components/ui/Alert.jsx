import React from 'react';

const types = { error: 'alert-error', success: 'alert-success', info: 'alert-info', warning: 'alert-warning' };

export default function Alert({ type = 'info', children, onClose }) {
  return (
    <div className={`alert ${types[type] || 'alert-info'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, opacity: 0.6 }}>&times;</button>
      )}
    </div>
  );
}
