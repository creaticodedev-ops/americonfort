import React, { useEffect, useState } from 'react';
import RevenueChart from '../../components/owner/RevenueChart';
import {
  AdminPage,
  PageHeader,
  StatCard,
  ChartCard,
  SegmentedControl,
  ErrorState,
} from '../../components/owner/ui';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';
import { downloadXlsxFromApi } from '../../utils/downloadXlsx';

const Analytics = () => {
  const { axios, currency } = useAppContext();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState(null);
  const [tab, setTab] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/owner/analytics');
        if (data.success) setAnalytics(data.analytics);
        else toast.error(data.message);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [axios]);

  const chartData = tab === 'weekly'
    ? analytics?.weeklyTrend
    : tab === 'yearly'
      ? analytics?.yearlyTrend
      : analytics?.monthlyTrend;

  const statusLabel = (id) => {
    const key = `admin.status.${id}`;
    const translated = t(key);
    return !translated || translated === key ? String(id || '').replace(/_/g, ' ') : translated;
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadXlsxFromApi(axios, '/api/owner/analytics/export', {
        fallbackName: 'analytics.xlsx',
      });
      toast.success(t('admin.exportUi.success'));
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.exportUi.failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.analytics.title')}
        description={t('admin.analytics.subtitle')}
        actions={
          <button type="button" disabled={exporting || loading} onClick={exportExcel} className="admin-btn admin-btn--secondary">
            {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.analytics.loading')}</p>
      ) : !analytics ? (
        <ErrorState
          title={t('admin.shell.loadError')}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('admin.analytics.thisWeek'), value: analytics.weeklyRevenue },
              { label: t('admin.analytics.thisMonth'), value: analytics.monthlyRevenue },
              { label: t('admin.analytics.thisYear'), value: analytics.yearlyRevenue },
              { label: t('admin.analytics.allTime'), value: analytics.totalRevenue },
            ].map((card) => (
              <StatCard key={card.label} label={card.label} value={`${currency}${card.value}`} />
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <StatCard
              tone="info"
              label={t('admin.analytics.onlineRevenue')}
              value={`${currency}${analytics.onlineRevenue ?? 0}`}
            />
            <StatCard
              tone="warning"
              label={t('admin.analytics.walkInRevenue')}
              value={`${currency}${analytics.walkInRevenue ?? 0}`}
            />
          </div>

          <ChartCard
            className="mt-6"
            title={t('admin.analytics.incomeTrends')}
            action={
              <SegmentedControl
                options={['weekly', 'monthly', 'yearly'].map((period) => ({
                  id: period,
                  label: t(`admin.analytics.${period}`),
                }))}
                value={tab}
                onChange={setTab}
                ariaLabel={t('admin.analytics.incomeTrends')}
              />
            }
          >
            <RevenueChart data={chartData || []} currency={currency} height={220} />
          </ChartCard>

          <ChartCard className="mt-6" title={t('admin.analytics.byStatus')}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(analytics.byStatus || []).map((row) => (
                <div
                  key={row._id}
                  className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3"
                >
                  <p className="text-xs text-[var(--admin-fg-muted)]">{statusLabel(row._id)}</p>
                  <p className="text-lg font-semibold text-[var(--admin-fg)]">{row.count}</p>
                  <p className="text-xs text-[var(--admin-fg-muted)]">{currency}{row.revenue || 0}</p>
                </div>
              ))}
            </div>
          </ChartCard>
        </>
      )}
    </AdminPage>
  );
};

export default Analytics;
