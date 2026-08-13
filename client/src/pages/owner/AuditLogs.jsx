import React, { useEffect, useState } from 'react';
import { AdminPage, PageHeader, EmptyState, Skeleton } from '../../components/owner/ui';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';

const AuditLogs = () => {
  const { axios } = useAppContext();
  const { t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/owner/audit-logs?page=${page}&limit=30`);
        if (data.success) {
          setLogs(data.logs);
          setPagination(data.pagination);
        } else toast.error(data.message);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, axios]);

  return (
    <AdminPage>
      <PageHeader title={t('admin.audit.title')} description={t('admin.audit.subtitle')} />

      <div className="admin-panel overflow-hidden">
        {loading ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState title={t('admin.audit.none')} />
        ) : (
          <div className="table-scroll admin-table-wrap">
            <table className="admin-table w-full text-sm text-start max-lg:min-w-[640px]">
              <thead>
                <tr>
                  <th className="p-3">{t('admin.audit.when')}</th>
                  <th className="p-3">{t('admin.audit.action')}</th>
                  <th className="p-3">{t('admin.audit.entity')}</th>
                  <th className="p-3">{t('admin.audit.details')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-t border-[var(--admin-border)]">
                    <td className="p-3 text-xs text-[var(--admin-fg-muted)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-[var(--admin-accent)] text-xs">{log.action}</td>
                    <td className="p-3 text-xs">
                      {log.entityType} {log.entityId ? `· ${String(log.entityId).slice(-8)}` : ''}
                    </td>
                    <td className="p-3 text-[var(--admin-fg-secondary)]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--admin-border)] text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="admin-btn admin-btn--secondary disabled:opacity-40"
            >
              {t('admin.common.previous')}
            </button>
            <span>{t('admin.bookings.pageOf', { page: pagination.page, total: pagination.totalPages })}</span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="admin-btn admin-btn--secondary disabled:opacity-40"
            >
              {t('admin.common.next')}
            </button>
          </div>
        )}
      </div>
    </AdminPage>
  );
};

export default AuditLogs;
