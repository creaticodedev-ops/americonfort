import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Title from '../../components/owner/Title';
import RevenueChart from '../../components/owner/RevenueChart';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';

const KpiCard = ({ label, value, sub, tone = 'default' }) => {
  const tones = {
    default: 'border-borderColor',
    danger: 'border-red-200 bg-red-50',
    success: 'border-green-200 bg-green-50',
    warn: 'border-amber-200 bg-amber-50',
    info: 'border-blue-200 bg-blue-50',
  };
  return (
    <div className={`rounded-xl border p-4 md:p-5 bg-white min-w-0 ${tones[tone] || tones.default}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className="text-xl md:text-2xl font-semibold text-gray-800 mt-1 break-words">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
    </div>
  );
};

const Dashboard = () => {
  const { axios, isOwner, currency, hasPermission } = useAppContext();
  const { t } = useI18n();
  const [dash, setDash] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOwner) return;
    const load = async () => {
      setLoading(true);
      try {
        const [ops, an] = await Promise.all([
          axios.get('/api/owner/ops-dashboard'),
          axios.get('/api/owner/analytics'),
        ]);
        if (ops.data.success) setDash(ops.data.dashboard);
        else toast.error(ops.data.message);
        if (an.data.success) setAnalytics(an.data.analytics);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOwner, axios]);

  if (loading) {
    return (
      <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 min-w-0">
        <Title title={t('admin.dashboard.title')} subTitle={t('admin.dashboard.subtitle')} />
        <p className="mt-8 text-gray-400">{t('admin.dashboard.loading')}</p>
      </div>
    );
  }

  if (!dash) {
    return (
      <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 min-w-0">
        <Title title={t('admin.dashboard.title')} subTitle={t('admin.dashboard.subtitle')} />
        <p className="mt-8 text-gray-500">{t('admin.shell.loadError')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          {t('admin.shell.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <Title
          title={t('admin.dashboard.title')}
          subTitle={t('admin.dashboard.subtitle')}
        />
        <div className="flex flex-wrap gap-2">
          <Link to="/owner/analytics" className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">{t('admin.dashboard.analytics')}</Link>
          <Link to="/owner/reports" className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">{t('admin.dashboard.reports')}</Link>
          {hasPermission('contracts') && (
            <Link to="/owner/contracts" className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">{t('admin.dashboard.contracts')}</Link>
          )}
          {hasPermission('templates') && (
            <Link to="/owner/templates" className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">{t('admin.dashboard.templates')}</Link>
          )}
          <Link to="/owner/manage-bookings" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dull">{t('admin.dashboard.reservations')}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-8">
        <KpiCard label={t('admin.dashboard.todayBookings')} value={dash.todayBookings} tone="info" />
        <KpiCard label={t('admin.dashboard.activeRentals')} value={dash.activeRentals} tone="success" />
        <KpiCard label={t('admin.dashboard.upcomingReturns')} value={dash.upcomingReturns?.length || 0} />
        <KpiCard label={t('admin.dashboard.overdueRentals')} value={dash.overdueCount} tone={dash.overdueCount ? 'danger' : 'default'} />
        <KpiCard label={t('admin.dashboard.monthlyRevenue')} value={`${currency}${dash.monthlyRevenue}`} tone="success" />
        <KpiCard
          label={t('admin.dashboard.occupancyRate')}
          value={`${dash.occupancyRate}%`}
          sub={t('admin.dashboard.occupancySub', { rented: dash.activeRentals, total: dash.totalCars })}
        />
        <KpiCard label={t('admin.dashboard.fleetUtilization')} value={`${dash.fleetUtilization}%`} sub={t('admin.dashboard.fleetUtilSub')} />
        <KpiCard label={t('admin.dashboard.pendingRequests')} value={dash.pendingBookings} tone={dash.pendingBookings ? 'warn' : 'default'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="rounded-xl border border-borderColor bg-white p-5 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-semibold text-gray-800">{t('admin.dashboard.revenueTrend')}</h2>
            <Link to="/owner/analytics" className="text-sm text-primary shrink-0">{t('admin.dashboard.viewAll')}</Link>
          </div>
          <RevenueChart data={analytics?.monthlyTrend || []} currency={currency} />
        </div>

        <div className="rounded-xl border border-borderColor bg-white p-5 min-w-0">
          <h2 className="font-semibold text-gray-800 mb-4">{t('admin.dashboard.fleetSnapshot')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-center min-w-0">
              <p className="text-2xl font-semibold text-green-700">{dash.availableVehicles}</p>
              <p className="text-xs text-green-600">{t('admin.dashboard.available')}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center min-w-0">
              <p className="text-2xl font-semibold text-blue-700">{dash.rentedVehicles}</p>
              <p className="text-xs text-blue-600">{t('admin.dashboard.onRent')}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center min-w-0">
              <p className="text-2xl font-semibold text-amber-700">{dash.maintenanceVehicles}</p>
              <p className="text-xs text-amber-600">{t('admin.dashboard.offline')}</p>
            </div>
          </div>
          <Link to="/owner/maintenance" className="mt-4 inline-block text-sm text-primary">{t('admin.dashboard.maintenanceLink')}</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="rounded-xl border border-borderColor bg-white p-5">
          <h2 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.upcomingPickups')}</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(dash.upcomingPickups || []).length === 0 && <p className="text-sm text-gray-400">{t('admin.dashboard.noPickups')}</p>}
            {(dash.upcomingPickups || []).map((b) => (
              <div key={b._id} className="text-sm border-b border-gray-50 pb-2 min-w-0">
                <p className="font-medium text-gray-700 truncate">{b.customerName || t('admin.common.guest')}</p>
                <p className="text-xs text-gray-500 truncate">{b.car?.brand} {b.car?.model} · {new Date(b.pickupDate).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-borderColor bg-white p-5">
          <h2 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.upcomingReturnsTitle')}</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(dash.upcomingReturns || []).length === 0 && <p className="text-sm text-gray-400">{t('admin.dashboard.noReturns')}</p>}
            {(dash.upcomingReturns || []).map((b) => (
              <div key={b._id} className="text-sm border-b border-gray-50 pb-2">
                <p className="font-medium text-gray-700">{b.customerName || t('admin.common.guest')}</p>
                <p className="text-xs text-gray-500">{b.car?.brand} {b.car?.model} · {new Date(b.returnDate).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-borderColor bg-white p-5">
          <h2 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.overdueTitle')}</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(dash.overdueRentals || []).length === 0 && <p className="text-sm text-gray-400">{t('admin.dashboard.noOverdue')}</p>}
            {(dash.overdueRentals || []).map((b) => (
              <div key={b._id} className="text-sm border-b border-red-50 pb-2">
                <p className="font-medium text-red-700">{b.customerName || t('admin.common.guest')}</p>
                <p className="text-xs text-red-500">{new Date(b.returnDate).toLocaleString()} · {b.reservationId}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
