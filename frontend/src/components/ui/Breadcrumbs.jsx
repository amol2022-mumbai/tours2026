import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumbs.css';

const routeLabels = {
  '': 'Dashboard',
  'leads': 'Leads / Enquiries',
  'customers': 'Customers',
  'tours': 'Tours & Packages',
  'itinerary': 'Itineraries',
  'quotations': 'Quotations',
  'bookings': 'Bookings',
  'travellers': 'Travellers',
  'payments': 'Payments',
  'expenses': 'Expenses',
  'suppliers': 'Suppliers',
  'hotels': 'Hotels',
  'transport': 'Transport',
  'documents': 'Documents',
  'followups': 'Follow-ups',
  'profitability': 'Profitability',
  'reports': 'Reports',
  'marketing': 'Marketing',
  'ai-assistant': 'AI Assistant',
  'staff': 'Staff & Users',
  'reminders': 'Reminders',
  'settings': 'Settings',
  'profile': 'My Profile',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);

  if (pathParts.length === 0) return null;

  const crumbs = pathParts.map((part, index) => {
    const path = '/' + pathParts.slice(0, index + 1).join('/');
    const isLast = index === pathParts.length - 1;
    const isId = /^\d+$/.test(part) || part.length > 30;
    const label = isId ? '#' + part.substring(0, 8) : (routeLabels[part] || part.replace(/-/g, ' '));

    return { path, label, isLast, isId };
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/" className="breadcrumb-home">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="breadcrumb-item">
          <span className="breadcrumb-sep">/</span>
          {crumb.isLast || crumb.isId ? (
            <span className="breadcrumb-current">{crumb.label}</span>
          ) : (
            <Link to={crumb.path}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
