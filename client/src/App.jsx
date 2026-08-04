import React from 'react'
import Navbar from './components/Navbar'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import CarDetails from './pages/CarDetails'
import Cars from './pages/Cars'
import BookingConfirmation from './pages/BookingConfirmation'
import CompleteBooking from './pages/CompleteBooking'
import NotFound from './pages/NotFound'
import Footer from './components/Footer'
import Layout from './pages/owner/Layout'
import Dashboard from './pages/owner/Dashboard'
import Analytics from './pages/owner/Analytics'
import AddCar from './pages/owner/AddCar'
import EditCar from './pages/owner/EditCar'
import ManageCars from './pages/owner/ManageCars'
import VehicleStatsPage from './pages/owner/VehicleStatsPage'
import VehicleStatsListPage from './pages/owner/VehicleStatsListPage'
import ManageBookings from './pages/owner/ManageBookings'
import WalkInBooking from './pages/owner/WalkInBooking'
import Customers from './pages/owner/Customers'
import BookingCalendar from './pages/owner/BookingCalendar'
import ManageLocations from './pages/owner/ManageLocations'
import Maintenance from './pages/owner/Maintenance'
import Reports from './pages/owner/Reports'
import AuditLogs from './pages/owner/AuditLogs'
import Contracts from './pages/owner/Contracts'
import Invoices from './pages/owner/Invoices'
import ExportTemplates from './pages/owner/ExportTemplates'
import Login from './components/Login'
import ErrorBoundary from './components/ErrorBoundary'
import RequirePermission from './components/owner/RequirePermission'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/AppContext'
import SuperAdminLogin from './pages/superadmin/Login'
import SuperAdminLayout from './pages/superadmin/Layout'
import SuperAdminDashboard from './pages/superadmin/Dashboard'
import SuperAdminAdmins from './pages/superadmin/Admins'
import SuperAdminAdminDetail from './pages/superadmin/AdminDetail'
import SuperAdminActivity from './pages/superadmin/Activity'
import SuperAdminAudit from './pages/superadmin/AuditLogs'

const withPerm = (permission, Component) => (
  <RequirePermission permission={permission}>{React.createElement(Component)}</RequirePermission>
)

const App = () => {
  const { showLogin } = useAppContext()
  const { pathname } = useLocation()
  const isOwnerPath = pathname.startsWith('/owner')
  const isSuperAdminPath = pathname.startsWith('/superadmin')
  const hidePublicChrome = isOwnerPath || isSuperAdminPath
  const needsNavOffset = !hidePublicChrome && pathname !== '/'

  return (
    <ErrorBoundary>
      <Toaster
        position="top-center"
        containerStyle={{ top: 72, left: 16, right: 16 }}
        toastOptions={{
          className: 'text-sm max-w-[min(100%,24rem)]',
          style: { wordBreak: 'break-word' },
        }}
      />
      {showLogin && !isSuperAdminPath && <Login />}

      {!hidePublicChrome && <Navbar />}

      <div className={needsNavOffset ? 'pt-[65px] sm:pt-[73px]' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/car-details/:id" element={<CarDetails />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/booking-confirmation" element={<BookingConfirmation />} />
          <Route path="/complete-booking/:token" element={<CompleteBooking />} />
          <Route path="/admin" element={<Navigate to="/owner" replace />} />
          <Route path="/owner" element={<Layout />}>
            <Route index element={withPerm('dashboard', Dashboard)} />
            <Route path="analytics" element={withPerm('analytics', Analytics)} />
            <Route path="add-car" element={withPerm('fleet', AddCar)} />
            <Route path="edit-car/:id" element={withPerm('fleet', EditCar)} />
            <Route path="manage-cars" element={withPerm('fleet', ManageCars)} />
            <Route path="vehicle-stats" element={withPerm('fleet', VehicleStatsListPage)} />
            <Route path="vehicle-stats/:id" element={withPerm('fleet', VehicleStatsPage)} />
            <Route path="manage-bookings" element={withPerm('bookings', ManageBookings)} />
            <Route path="walk-in" element={withPerm('bookings', WalkInBooking)} />
            <Route path="customers" element={withPerm('customers', Customers)} />
            <Route path="locations" element={withPerm('locations', ManageLocations)} />
            <Route path="calendar" element={withPerm('calendar', BookingCalendar)} />
            <Route path="maintenance" element={withPerm('maintenance', Maintenance)} />
            <Route path="reports" element={withPerm('reports', Reports)} />
            <Route path="contracts" element={withPerm('contracts', Contracts)} />
            <Route path="invoices" element={withPerm('contracts', Invoices)} />
            <Route path="templates" element={withPerm('templates', ExportTemplates)} />
            <Route path="audit" element={withPerm('audit', AuditLogs)} />
          </Route>
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="admins" element={<SuperAdminAdmins />} />
            <Route path="admins/:id" element={<SuperAdminAdminDetail />} />
            <Route path="activity" element={<SuperAdminActivity />} />
            <Route path="audit" element={<SuperAdminAudit />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {!hidePublicChrome && <Footer />}
    </ErrorBoundary>
  )
}

export default App
