import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function DashboardLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  if (loading) {
    return <LoadingSpinner fullPage text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

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
