import { useState, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function getDefaultCollapsed() {
  if (typeof window === 'undefined') return true;
  if (window.innerWidth < 1024) return true;
  try {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored !== null) return stored === 'true';
  } catch {}
  return false;
}

export default function DashboardLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getDefaultCollapsed);

  if (loading) {
    return <LoadingSpinner fullPage text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (window.innerWidth >= 1024) {
        try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      }
      return next;
    });
  }, []);

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <Header onMenuToggle={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
      <main className="main-content">
        <div className="page-container">
          <Breadcrumbs />
          <div style={{ marginTop: 8 }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
