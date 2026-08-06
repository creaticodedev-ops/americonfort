import React, { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import Loader from './components/Loader'
import RequirePermission from './components/owner/RequirePermission'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/AppContext'

const CarDetails = lazy(() => import('./pages/CarDetails'))
const Cars = lazy(() => import('./pages/Cars'))
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'))
const CompleteBooking = lazy(() => import('./pages/CompleteBooking'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./components/Login'))

const Layout = lazy(() => import('./pages/owner/Layout'))
const Dashboard = lazy(() => import('./pages/owner/Dashboard'))
const Analytics = lazy(() => import('./pages/owner/Analytics'))
const AddCar = lazy(() => import('./pages/owner/AddCar'))
const EditCar = lazy(() => import('./pages/owner/EditCar'))
const ManageCars = lazy(() => import('./pages/owner/ManageCars'))
const VehicleStatsPage = lazy(() => import('./pages/owner/VehicleStatsPage'))
const VehicleStatsListPage = lazy(() => import('./pages/owner/VehicleStatsListPage'))
const ManageBookings = lazy(() => import('./pages/owner/ManageBookings'))
const WalkInBooking = lazy(() => import('./pages/owner/WalkInBooking'))
const Customers = lazy(() => import('./pages/owner/Customers'))
const BookingCalendar = lazy(() => import('./pages/owner/BookingCalendar'))
const ManageLocations = lazy(() => import('./pages/owner/ManageLocations'))
const Maintenance = lazy(() => import('./pages/owner/Maintenance'))
const Reports = lazy(() => import('./pages/owner/Reports'))
const AuditLogs = lazy(() => import('./pages/owner/AuditLogs'))
const Contracts = lazy(() => import('./pages/owner/Contracts'))
const Invoices = lazy(() => import('./pages/owner/Invoices'))
const ExportTemplates = lazy(() => import('./pages/owner/ExportTemplates'))

const SuperAdminLogin = lazy(() => import('./pages/superadmin/Login'))
const SuperAdminLayout = lazy(() => import('./pages/superadmin/Layout'))
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'))
const SuperAdminAdmins = lazy(() => import('./pages/superadmin/Admins'))
const SuperAdminAdminDetail = lazy(() => import('./pages/superadmin/AdminDetail'))
const SuperAdminActivity = lazy(() => import('./pages/superadmin/Activity'))
const SuperAdminAudit = lazy(() => import('./pages/superadmin/AuditLogs'))

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
      {showLogin && !isSuperAdminPath && (
        <Suspense fallback={null}>
          <Login />
        </Suspense>
      )}

      {!hidePublicChrome && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
      )}

      {!hidePublicChrome && <Navbar />}

      <div className={needsNavOffset ? 'pt-[65px] sm:pt-[73px]' : ''}>
        <Suspense fallback={<Loader />}>
          {hidePublicChrome ? (
            <Routes>
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
          ) : (
            <main id="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/car-details/:id" element={<CarDetails />} />
                <Route path="/cars" element={<Cars />} />
                <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                <Route path="/complete-booking/:token" element={<CompleteBooking />} />
                <Route path="/admin" element={<Navigate to="/owner" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          )}
        </Suspense>
      </div>

      {!hidePublicChrome && <Footer />}
    </ErrorBoundary>
  )
}

export default App
