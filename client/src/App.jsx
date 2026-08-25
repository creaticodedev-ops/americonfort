import React, { Suspense } from 'react'
import Navbar from './components/Navbar'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import Loader from './components/Loader'
import SiteAnalytics from './components/Analytics'
import RequirePermission from './components/owner/RequirePermission'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/AppContext'
import { lazyWithRetry } from './utils/lazyWithRetry'

const CarDetails = lazyWithRetry(() => import('./pages/CarDetails'))
const Cars = lazyWithRetry(() => import('./pages/Cars'))
const BookingConfirmation = lazyWithRetry(() => import('./pages/BookingConfirmation'))
const CompleteBooking = lazyWithRetry(() => import('./pages/CompleteBooking'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))
const Login = lazyWithRetry(() => import('./components/Login'))
const AirportLanding = lazyWithRetry(() => import('./pages/AirportLanding'))
const About = lazyWithRetry(() => import('./pages/About'))
const Contact = lazyWithRetry(() => import('./pages/Contact'))
const Faq = lazyWithRetry(() => import('./pages/Faq'))
const Terms = lazyWithRetry(() => import('./pages/Terms'))
const Privacy = lazyWithRetry(() => import('./pages/Privacy'))
const Insurance = lazyWithRetry(() => import('./pages/Insurance'))
const Cookies = lazyWithRetry(() => import('./pages/Cookies'))

const Layout = lazyWithRetry(() => import('./pages/owner/Layout'))
const Dashboard = lazyWithRetry(() => import('./pages/owner/Dashboard'))
const Analytics = lazyWithRetry(() => import('./pages/owner/Analytics'))
const AddCar = lazyWithRetry(() => import('./pages/owner/AddCar'))
const EditCar = lazyWithRetry(() => import('./pages/owner/EditCar'))
const ManageCars = lazyWithRetry(() => import('./pages/owner/ManageCars'))
const VehicleStatsPage = lazyWithRetry(() => import('./pages/owner/VehicleStatsPage'))
const VehicleStatsListPage = lazyWithRetry(() => import('./pages/owner/VehicleStatsListPage'))
const ManageBookings = lazyWithRetry(() => import('./pages/owner/ManageBookings'))
const WalkInBooking = lazyWithRetry(() => import('./pages/owner/WalkInBooking'))
const Customers = lazyWithRetry(() => import('./pages/owner/Customers'))
const ClientDocuments = lazyWithRetry(() => import('./pages/owner/ClientDocuments'))
const BookingCalendar = lazyWithRetry(() => import('./pages/owner/BookingCalendar'))
const ManageLocations = lazyWithRetry(() => import('./pages/owner/ManageLocations'))
const Maintenance = lazyWithRetry(() => import('./pages/owner/Maintenance'))
const Reports = lazyWithRetry(() => import('./pages/owner/Reports'))
const AuditLogs = lazyWithRetry(() => import('./pages/owner/AuditLogs'))
const Contracts = lazyWithRetry(() => import('./pages/owner/Contracts'))
const Invoices = lazyWithRetry(() => import('./pages/owner/Invoices'))
const ExportTemplates = lazyWithRetry(() => import('./pages/owner/ExportTemplates'))
const Settings = lazyWithRetry(() => import('./pages/owner/Settings'))
const Samsars = lazyWithRetry(() => import('./pages/owner/Samsars'))
const PartnerCompanies = lazyWithRetry(() => import('./pages/owner/PartnerCompanies'))
const Chauffeurs = lazyWithRetry(() => import('./pages/owner/Chauffeurs'))
const SignatureRequests = lazyWithRetry(() => import('./pages/owner/SignatureRequests'))
const Employees = lazyWithRetry(() => import('./pages/owner/Employees'))
const Staff = lazyWithRetry(() => import('./pages/owner/Staff'))
const AccountingOverview = lazyWithRetry(() => import('./pages/owner/accounting/AccountingOverview'))
const RevenuesPage = lazyWithRetry(async () => {
  const m = await import('./pages/owner/accounting/AccountingLists')
  return { default: m.RevenuesPage }
})
const SamsarPaymentsPage = lazyWithRetry(async () => {
  const m = await import('./pages/owner/accounting/AccountingLists')
  return { default: m.SamsarPaymentsPage }
})
const AgencyExpensesPage = lazyWithRetry(async () => {
  const m = await import('./pages/owner/accounting/AccountingLists')
  return { default: m.AgencyExpensesPage }
})
const VehicleExpensesPage = lazyWithRetry(async () => {
  const m = await import('./pages/owner/accounting/AccountingLists')
  return { default: m.VehicleExpensesPage }
})

const SuperAdminLogin = lazyWithRetry(() => import('./pages/superadmin/Login'))
const SuperAdminLayout = lazyWithRetry(() => import('./pages/superadmin/Layout'))
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/superadmin/Dashboard'))
const SuperAdminAgencies = lazyWithRetry(() => import('./pages/superadmin/Agencies'))
const SuperAdminAgencyDetail = lazyWithRetry(() => import('./pages/superadmin/AgencyDetail'))
const SuperAdminPlans = lazyWithRetry(() => import('./pages/superadmin/Plans'))
const SuperAdminAdmins = lazyWithRetry(() => import('./pages/superadmin/Admins'))
const SuperAdminAdminDetail = lazyWithRetry(() => import('./pages/superadmin/AdminDetail'))
const SuperAdminActivity = lazyWithRetry(() => import('./pages/superadmin/Activity'))
const SuperAdminAudit = lazyWithRetry(() => import('./pages/superadmin/AuditLogs'))

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
      <SiteAnalytics />

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
                <Route path="client-documents" element={withPerm('customers', ClientDocuments)} />
                <Route path="signature-requests" element={withPerm('signature_requests', SignatureRequests)} />
                <Route path="locations" element={withPerm('locations', ManageLocations)} />
                <Route path="calendar" element={withPerm('calendar', BookingCalendar)} />
                <Route path="maintenance" element={withPerm('maintenance', Maintenance)} />
                <Route path="chauffeurs" element={withPerm('chauffeurs', Chauffeurs)} />
                <Route path="samsars" element={withPerm('partners', Samsars)} />
                <Route path="partner-companies" element={withPerm('partners', PartnerCompanies)} />
                <Route path="employees" element={withPerm('employees', Employees)} />
                <Route path="reports" element={withPerm('reports', Reports)} />
                <Route path="contracts" element={withPerm('contracts', Contracts)} />
                <Route path="invoices" element={withPerm('contracts', Invoices)} />
                <Route path="templates" element={withPerm('templates', ExportTemplates)} />
                <Route path="accounting" element={withPerm('accounting', AccountingOverview)} />
                <Route path="accounting/revenues" element={withPerm('accounting', RevenuesPage)} />
                <Route path="accounting/samsar-payments" element={withPerm('accounting', SamsarPaymentsPage)} />
                <Route path="accounting/agency-expenses" element={withPerm('accounting', AgencyExpensesPage)} />
                <Route path="accounting/vehicle-expenses" element={withPerm('accounting', VehicleExpensesPage)} />
                <Route path="audit" element={withPerm('audit', AuditLogs)} />
                <Route path="staff" element={<Staff />} />
                <Route path="settings/*" element={<Settings />} />
              </Route>
              <Route path="/superadmin/login" element={<SuperAdminLogin />} />
              <Route path="/superadmin" element={<SuperAdminLayout />}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="agencies" element={<SuperAdminAgencies />} />
                <Route path="agencies/:id" element={<SuperAdminAgencyDetail />} />
                <Route path="plans" element={<SuperAdminPlans />} />
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
                <Route path="/location-voiture-casablanca-aeroport" element={<AirportLanding />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/insurance" element={<Insurance />} />
                <Route path="/cookies" element={<Cookies />} />
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
