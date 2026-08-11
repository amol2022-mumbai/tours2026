import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Leads from './pages/leads/Leads';
import LeadDetail from './pages/leads/LeadDetail';
import Customers from './pages/customers/Customers';
import CustomerDetail from './pages/customers/CustomerDetail';
import Tours from './pages/tours/Tours';
import TourDetail from './pages/tours/TourDetail';
import ItineraryView from './pages/itinerary/ItineraryView';
import Quotations from './pages/quotations/Quotations';
import Bookings from './pages/bookings/Bookings';
import BookingDetail from './pages/bookings/BookingDetail';
import Payments from './pages/payments/Payments';
import Suppliers from './pages/suppliers/Suppliers';
import Expenses from './pages/expenses/Expenses';
import Profitability from './pages/profitability/Profitability';
import Documents from './pages/documents/Documents';
import Reports from './pages/reports/Reports';
import Staff from './pages/staff/Staff';
import Marketing from './pages/marketing/Marketing';
import Reminders from './pages/reminders/Reminders';
import Travellers from './pages/travellers/Travellers';
import Hotels from './pages/hotels/Hotels';
import Transport from './pages/transport/Transport';
import Followups from './pages/followups/Followups';
import AIAssistant from './pages/ai-assistant/AIAssistant';
import Settings from './pages/settings/Settings';
import Profile from './pages/Profile';

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage text="Initializing..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/tours/:id" element={<TourDetail />} />
        <Route path="/tours/:id/itinerary" element={<ItineraryView />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/profitability" element={<Profitability />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/travellers" element={<Travellers />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/transport" element={<Transport />} />
        <Route path="/followups" element={<Followups />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
