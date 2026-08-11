import React from 'react';
import './Badge.css';

const colorMap = {
  success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger',
  info: 'badge-info', primary: 'badge-primary', gray: 'badge-gray',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  const colorClass = colorMap[color] || 'badge-gray';
  return <span className={`badge ${colorClass} ${className}`}>{children}</span>;
}
