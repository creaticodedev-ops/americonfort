import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AdminPage, PageHeader } from '../../components/owner/ui';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import { getErrorMessage } from '../../utils/apiError';
import Loader from '../../components/Loader';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const ClientDocuments = () => {
  const { axios } = useAppContext();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const { data } = await axios.get(`/api/owner/client-documents?${params}`);
      if (data.success) setItems(data.items || []);
      else toast.error(data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [axios, appliedSearch]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = async (row) => {
    setSelected(row);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await axios.get(`/api/owner/client-documents/${row._id}`);
      if (data.success) setDetail(data.document);
      else toast.error(data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const replaceDocument = async (file) => {
    if (!file || !selected?._id) return;
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(`/api/owner/client-documents/${selected._id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        toast.success(data.message);
        openDetail(selected);
        fetchList();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReplacing(false);
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(search);
  };

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.clientDocuments.title')}
        description={t('admin.clientDocuments.subtitle')}
      />

      <form onSubmit={onSearchSubmit} className="admin-panel mb-4">
        <div className="admin-panel-body flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.clientDocuments.searchPlaceholder')}
            className="admin-input flex-1"
          />
          <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
            {t('admin.clientDocuments.search')}
          </button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 admin-panel">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{t('admin.clientDocuments.listTitle')}</h2>
          </div>
          <div className="admin-panel-body p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader /></div>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.empty')}</p>
            ) : (
              <table className="admin-table w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th>{t('admin.clientDocuments.colClient')}</th>
                    <th>{t('admin.clientDocuments.colPhone')}</th>
                    <th>{t('admin.clientDocuments.colId')}</th>
                    <th>{t('admin.clientDocuments.colStatus')}</th>
                    <th>{t('admin.clientDocuments.colUpdated')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row._id} className={selected?._id === row._id ? 'is-selected' : ''}>
                      <td className="font-medium">{row.customerName || '—'}</td>
                      <td>{row.customerPhone || '—'}</td>
                      <td>{row.identityDocumentNumber || row.passportNumber || '—'}</td>
                      <td>
                        <span className="admin-badge admin-badge--success">
                          {t('admin.clientDocuments.available')}
                        </span>
                      </td>
                      <td>{formatDate(row.updatedAt)}</td>
                      <td>
                        <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => openDetail(row)}>
                          {t('admin.clientDocuments.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 admin-panel">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{t('admin.clientDocuments.detailTitle')}</h2>
          </div>
          <div className="admin-panel-body">
            {!selected ? (
              <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.selectHint')}</p>
            ) : detailLoading ? (
              <div className="py-8 flex justify-center"><Loader /></div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.colClient')}:</span> {detail.customerName || '—'}</p>
                  <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.colPhone')}:</span> {detail.customerPhone || '—'}</p>
                  {detail.identityDocumentNumber && (
                    <p><span className="text-[var(--admin-fg-muted)]">{t('admin.walkIn.identityDocument')}:</span> {detail.identityDocumentNumber}</p>
                  )}
                  {detail.passportNumber && (
                    <p><span className="text-[var(--admin-fg-muted)]">{t('admin.walkIn.passport')}:</span> {detail.passportNumber}</p>
                  )}
                  <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.reservations')}:</span> {detail.reservationCount || detail.bookingIds?.length || 0}</p>
                  <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.colUpdated')}:</span> {formatDate(detail.updatedAt)}</p>
                </div>

                {detail.documentUrl && (
                  <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
                    <img
                      src={detail.documentUrl}
                      alt={t('admin.clientDocuments.preview')}
                      className="max-h-[min(50vh,420px)] w-full object-contain"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {detail.documentUrl && (
                    <a href={detail.documentUrl} target="_blank" rel="noreferrer" className="admin-btn admin-btn--secondary admin-btn--sm">
                      {t('admin.clientDocuments.download')}
                    </a>
                  )}
                  <label className="admin-btn admin-btn--primary admin-btn--sm cursor-pointer">
                    {replacing ? '…' : t('admin.clientDocuments.replace')}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={replacing}
                      onChange={(e) => replaceDocument(e.target.files?.[0])}
                    />
                  </label>
                </div>

                {detail.bookings?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)] mb-2">
                      {t('admin.clientDocuments.relatedReservations')}
                    </p>
                    <ul className="space-y-2 text-sm">
                      {detail.bookings.map((b) => (
                        <li key={b._id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                          <Link to="/owner/manage-bookings" className="font-medium text-[var(--admin-accent)] hover:underline">
                            {b.reservationId}
                          </Link>
                          <span className="text-[var(--admin-fg-muted)]"> · {b.car?.brand} {b.car?.model}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.loadFailed')}</p>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
};

export default ClientDocuments;
