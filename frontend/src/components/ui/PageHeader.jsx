import React from 'react';

export default function PageHeader({ title, actions }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}
