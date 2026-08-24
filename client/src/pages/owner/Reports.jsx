import React, { useEffect, useState } from 'react';
import {
  AdminPage,
  PageHeader,
  StatCard,
  ChartCard,
} from '../../components/owner/ui';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';
import { downloadXlsxFromApi } from '../../utils/downloadXlsx';

const Reports = () => {
  const { axios, currency } = useAppContext();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState(null);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    axios.get('/api/owner/analytics')
      .then(({ data }) => { if (data.success) setAnalytics(data.analytics); })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, [axios]);

  const download = async (type) => {
    setExporting(type);
    try {
      await downloadXlsxFromApi(axios, '/api/owner/reports/export', {
        params: { type },
        fallbackName: `${type}-report.xlsx`,
      });
      toast.success(t('admin.exportUi.success'));
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.exportUi.failed'));
    } finally {
      setExporting('');
    }
  };

  const printPdf = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      toast.error(t('admin.reportsUi.allowPopups'));
      return;
    }
    w.document.write(`
      <html><head><title>${t('admin.reportsUi.agencyReport')}</title>
      <style>body{font-family:Arial;padding:32px}h1{margin:0 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{border:1px solid #e5e7eb;padding:16px;border-radius:8px}</style>
      </head><body>
      <h1>${t('admin.reportsUi.agencyReport')}</h1>
      <p>${new Date().toLocaleString()}</p>
      <div class="grid">
        <div class="card"><b>${t('admin.reportsUi.weekly')}</b><br/>${currency}${analytics?.weeklyRevenue || 0}</div>
        <div class="card"><b>${t('admin.reportsUi.monthly')}</b><br/>${currency}${analytics?.monthlyRevenue || 0}</div>
        <div class="card"><b>${t('admin.reportsUi.yearly')}</b><br/>${currency}${analytics?.yearlyRevenue || 0}</div>
        <div class="card"><b>${t('admin.reportsUi.total')}</b><br/>${currency}${analytics?.totalRevenue || 0}</div>
      </div>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    w.document.close();
  };

  const exportCards = [
    { type: 'revenue', title: t('admin.reportsUi.reservationsTitle'), desc: t('admin.reportsUi.reservationsDesc') },
    { type: 'customers', title: t('admin.reportsUi.customersTitle'), desc: t('admin.reportsUi.customersDesc') },
    { type: 'fleet', title: t('admin.reportsUi.fleetTitle'), desc: t('admin.reportsUi.fleetDesc') },
  ];

  return (
    <AdminPage>
      <PageHeader title={t('admin.reports.title')} description={t('admin.reports.subtitle')} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('admin.reports.weekly'), value: analytics?.weeklyRevenue },
          { label: t('admin.reports.monthly'), value: analytics?.monthlyRevenue },
          { label: t('admin.reports.yearly'), value: analytics?.yearlyRevenue },
          { label: t('admin.reports.allTime'), value: analytics?.totalRevenue },
        ].map((c) => (
          <StatCard
            key={c.label}
            label={`${c.label} ${t('admin.reports.revenue')}`}
            value={`${currency}${c.value ?? '—'}`}
          />
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportCards.map((card) => (
          <div key={card.type} className="admin-panel p-5">
            <h3 className="text-sm font-semibold text-[var(--admin-fg)]">{card.title}</h3>
            <p className="text-sm text-[var(--admin-fg-secondary)] mt-1">{card.desc}</p>
            <button
              type="button"
              disabled={exporting === card.type}
              onClick={() => download(card.type)}
              className="admin-btn admin-btn--primary mt-4"
            >
              {exporting === card.type ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
            </button>
          </div>
        ))}
      </div>

      <ChartCard className="mt-6" title={t('admin.reports.pdfTitle')}>
        <p className="text-sm text-[var(--admin-fg-secondary)]">{t('admin.reports.pdfHint')}</p>
        <button type="button" onClick={printPdf} className="admin-btn admin-btn--secondary mt-4">
          {t('admin.reports.printPdf')}
        </button>
      </ChartCard>
    </AdminPage>
  );
};

export default Reports;
