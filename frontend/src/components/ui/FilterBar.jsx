import React from 'react';

export default function FilterBar({ children }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      {children}
    </div>
  );
}
