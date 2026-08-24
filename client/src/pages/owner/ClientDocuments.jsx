import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AdminPage, PageHeader, FilterBar, SearchInput, AdminModal } from '../../components/owner/ui';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import { getErrorMessage } from '../../utils/apiError';
import { downloadXlsxFromApi } from '../../utils/downloadXlsx';
import Loader from '../../components/Loader';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const DOC_TYPE_LABELS = {
  combined: 'admin.clientDocuments.typeCombined',
  national_id: 'admin.clientDocuments.typeNationalId',
  driving_license: 'admin.clientDocuments.typeDrivingLicense',
  passport: 'admin.clientDocuments.typePassport',
  identity: 'admin.clientDocuments.typeIdentity',
  other: 'admin.clientDocuments.typeOther',
};

const emptyFilters = {
  search: '',
  documentType: 'all',
  channel: 'all',
  docStatus: 'available',
  datePreset: 'all',
  sortBy: 'updated',
};

const ClientDocuments = () => {
  const { axios } = useAppContext();
  const { t } = useI18n();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(applied).forEach(([k, v]) => {
      if (v && v !== 'all') params.set(k, v);
    });
    return params.toString();
  }, [applied]);

  const documentTypeLabel = useCallback((value) => {
    if (value === 'all') return t('admin.clientDocuments.filterDocTypeAll');
    return t(DOC_TYPE_LABELS[value] || DOC_TYPE_LABELS.other);
  }, [t]);

  const channelLabel = useCallback((value) => {
    if (value === 'walk_in') return t('admin.clientDocuments.filterWalkIn');
    if (value === 'online') return t('admin.clientDocuments.filterOnline');
    return t('admin.clientDocuments.filterChannelAll');
  }, [t]);

  const docStatusLabel = useCallback((value) => {
    if (value === 'available') return t('admin.clientDocuments.filterAvailable');
    if (value === 'missing') return t('admin.clientDocuments.filterMissing');
    return t('admin.clientDocuments.filterStatusAll');
  }, [t]);

  const dateLabel = useCallback((value) => {
    if (value === 'today') return t('admin.clientDocuments.filterDateToday');
    if (value === 'week') return t('admin.clientDocuments.filterDateWeek');
    if (value === 'month') return t('admin.clientDocuments.filterDateMonth');
    return t('admin.clientDocuments.filterDateAll');
  }, [t]);

  const sortLabel = useCallback((value) => {
    if (value === 'name') return t('admin.clientDocuments.sortName');
    if (value === 'documents') return t('admin.clientDocuments.sortDocuments');
    if (value === 'reservations') return t('admin.clientDocuments.sortReservations');
    return t('admin.clientDocuments.sortUpdated');
  }, [t]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (applied.search?.trim()) {
      chips.push({
        key: 'search',
        label: t('admin.clientDocuments.chipSearch', { q: applied.search.trim() }),
        clearTo: '',
      });
    }
    if (applied.documentType !== 'all') {
      chips.push({
        key: 'documentType',
        label: t('admin.clientDocuments.chipDocType', { value: documentTypeLabel(applied.documentType) }),
        clearTo: 'all',
      });
    }
    if (applied.channel !== 'all') {
      chips.push({
        key: 'channel',
        label: t('admin.clientDocuments.chipChannel', { value: channelLabel(applied.channel) }),
        clearTo: 'all',
      });
    }
    if (applied.docStatus !== emptyFilters.docStatus) {
      chips.push({
        key: 'docStatus',
        label: t('admin.clientDocuments.chipStatus', { value: docStatusLabel(applied.docStatus) }),
        clearTo: emptyFilters.docStatus,
      });
    }
    if (applied.datePreset !== 'all') {
      chips.push({
        key: 'datePreset',
        label: t('admin.clientDocuments.chipDate', { value: dateLabel(applied.datePreset) }),
        clearTo: 'all',
      });
    }
    if (applied.sortBy !== emptyFilters.sortBy) {
      chips.push({
        key: 'sortBy',
        label: t('admin.clientDocuments.chipSort', { value: sortLabel(applied.sortBy) }),
        clearTo: emptyFilters.sortBy,
      });
    }
    return chips;
  }, [applied, t, documentTypeLabel, channelLabel, docStatusLabel, dateLabel, sortLabel]);

  const hasActiveFilters = activeFilterChips.length > 0;
  const draftDirty = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(applied),
    [filters, applied],
  );

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await axios.get('/api/owner/client-documents/stats');
      if (data.success) setStats(data.stats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatsLoading(false);
    }
  }, [axios]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/owner/client-documents?${queryString}`);
      if (data.success) setItems(data.items || []);
      else toast.error(data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [axios, queryString]);

  useEffect(() => {
    fetchStats();
    fetchList();
  }, [fetchStats, fetchList]);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({ ...filters });
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
  };

  const removeChip = (key, clearTo) => {
    const next = { ...applied, [key]: clearTo };
    setFilters(next);
    setApplied(next);
  };

  const openDetail = async (row) => {
    setSelected(row);
    setDetail(null);
    setDrawerOpen(true);
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
        fetchStats();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReplacing(false);
    }
  };

  const statCards = [
    { key: 'totalClientsWithDocuments', label: t('admin.clientDocuments.statClients'), value: stats?.totalClientsWithDocuments ?? 0 },
    { key: 'totalDocuments', label: t('admin.clientDocuments.statDocuments'), value: stats?.totalDocuments ?? 0 },
    { key: 'walkInClients', label: t('admin.clientDocuments.statWalkIn'), value: stats?.walkInClients ?? 0 },
    { key: 'recentlyUpdated', label: t('admin.clientDocuments.statRecent'), value: stats?.recentlyUpdated ?? 0 },
  ];

  const selectClass = (isActive) =>
    `admin-form-control admin-filter-select${isActive ? ' is-filtered' : ''}`;

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.clientDocuments.title')}
        description={t('admin.clientDocuments.subtitle')}
        actions={
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const params = {};
                Object.entries(applied).forEach(([k, v]) => {
                  if (v && v !== 'all') params[k] = v;
                });
                await downloadXlsxFromApi(axios, '/api/owner/client-documents/export', {
                  params,
                  fallbackName: 'client-documents.xlsx',
                });
                toast.success(t('admin.exportUi.success'));
              } catch (err) {
                toast.error(getErrorMessage(err) || t('admin.exportUi.failed'));
              } finally {
                setExporting(false);
              }
            }}
            className="admin-btn admin-btn--secondary"
          >
            {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        {statCards.map((card) => (
          <div key={card.key} className="admin-stat">
            <p className="admin-stat-label">{card.label}</p>
            <p className="admin-stat-value">{statsLoading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={applyFilters} className="admin-docs-filters mb-4">
        <div className="admin-docs-filters__head">
          <div>
            <h2 className="admin-docs-filters__title">{t('admin.clientDocuments.filtersTitle')}</h2>
            <p className="admin-docs-filters__hint">{t('admin.clientDocuments.filtersHint')}</p>
          </div>
          {hasActiveFilters && (
            <span className="admin-docs-filters__count">
              {t('admin.clientDocuments.activeCount', { count: activeFilterChips.length })}
            </span>
          )}
        </div>

        <FilterBar className="admin-filter-bar--stack !mb-0 !border-0 !bg-transparent !p-0">
          <div className="admin-filter-bar-row">
            <SearchInput
              value={filters.search}
              onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
              placeholder={t('admin.clientDocuments.searchPlaceholder')}
              className={`min-w-[min(100%,280px)] flex-1${filters.search?.trim() ? ' is-filtered' : ''}`}
            />
            <select
              className={selectClass(filters.documentType !== 'all')}
              value={filters.documentType}
              onChange={(e) => setFilters((f) => ({ ...f, documentType: e.target.value }))}
              aria-label={t('admin.clientDocuments.filterDocTypeAll')}
            >
              <option value="all">{t('admin.clientDocuments.filterDocTypeAll')}</option>
              <option value="combined">{t('admin.clientDocuments.typeCombined')}</option>
              <option value="national_id">{t('admin.clientDocuments.typeNationalId')}</option>
              <option value="driving_license">{t('admin.clientDocuments.typeDrivingLicense')}</option>
              <option value="passport">{t('admin.clientDocuments.typePassport')}</option>
              <option value="other">{t('admin.clientDocuments.typeOther')}</option>
            </select>
            <select
              className={selectClass(filters.channel !== 'all')}
              value={filters.channel}
              onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value }))}
              aria-label={t('admin.clientDocuments.filterChannelAll')}
            >
              <option value="all">{t('admin.clientDocuments.filterChannelAll')}</option>
              <option value="walk_in">{t('admin.clientDocuments.filterWalkIn')}</option>
              <option value="online">{t('admin.clientDocuments.filterOnline')}</option>
            </select>
            <select
              className={selectClass(filters.docStatus !== emptyFilters.docStatus)}
              value={filters.docStatus}
              onChange={(e) => setFilters((f) => ({ ...f, docStatus: e.target.value }))}
              aria-label={t('admin.clientDocuments.filterAvailable')}
            >
              <option value="available">{t('admin.clientDocuments.filterAvailable')}</option>
              <option value="missing">{t('admin.clientDocuments.filterMissing')}</option>
              <option value="all">{t('admin.clientDocuments.filterStatusAll')}</option>
            </select>
            <select
              className={selectClass(filters.datePreset !== 'all')}
              value={filters.datePreset}
              onChange={(e) => setFilters((f) => ({ ...f, datePreset: e.target.value }))}
              aria-label={t('admin.clientDocuments.filterDateAll')}
            >
              <option value="all">{t('admin.clientDocuments.filterDateAll')}</option>
              <option value="today">{t('admin.clientDocuments.filterDateToday')}</option>
              <option value="week">{t('admin.clientDocuments.filterDateWeek')}</option>
              <option value="month">{t('admin.clientDocuments.filterDateMonth')}</option>
            </select>
            <select
              className={selectClass(filters.sortBy !== emptyFilters.sortBy)}
              value={filters.sortBy}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              aria-label={t('admin.clientDocuments.sortUpdated')}
            >
              <option value="updated">{t('admin.clientDocuments.sortUpdated')}</option>
              <option value="name">{t('admin.clientDocuments.sortName')}</option>
              <option value="documents">{t('admin.clientDocuments.sortDocuments')}</option>
              <option value="reservations">{t('admin.clientDocuments.sortReservations')}</option>
            </select>
            <div className="admin-filter-bar-actions">
              <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
                {t('admin.clientDocuments.applyFilters')}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={resetFilters}
                disabled={!hasActiveFilters && !draftDirty}
              >
                {t('admin.clientDocuments.resetFilters')}
              </button>
            </div>
          </div>
        </FilterBar>

        {hasActiveFilters && (
          <div className="admin-filter-active" role="status" aria-live="polite">
            <span className="admin-filter-active__label">{t('admin.clientDocuments.activeFilters')}</span>
            <div className="admin-filter-chips">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="admin-filter-chip"
                  onClick={() => removeChip(chip.key, chip.clearTo)}
                  title={t('admin.clientDocuments.removeFilter')}
                >
                  <span className="admin-filter-chip__text">{chip.label}</span>
                  <span className="admin-filter-chip__x" aria-hidden="true">×</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="admin-filter-active__clear"
              onClick={resetFilters}
            >
              {t('admin.clientDocuments.clearAllFilters')}
            </button>
          </div>
        )}
      </form>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">{t('admin.clientDocuments.listTitle')}</h2>
          {!loading && (
            <p className="text-xs text-[var(--admin-fg-muted)]">
              {t('admin.clientDocuments.showingCount', { count: items.length })}
            </p>
          )}
        </div>
        <div className="admin-panel-body p-0 overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader /></div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center max-w-md mx-auto">
              <p className="font-medium text-[var(--admin-fg)]">{t('admin.clientDocuments.emptyTitle')}</p>
              <p className="mt-2 text-sm text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.emptyDescription')}</p>
            </div>
          ) : (
            <table className="admin-table w-full min-w-[720px]">
              <thead>
                <tr>
                  <th>{t('admin.clientDocuments.colClient')}</th>
                  <th>{t('admin.clientDocuments.colPhone')}</th>
                  <th>{t('admin.clientDocuments.colDocuments')}</th>
                  <th>{t('admin.clientDocuments.colReservations')}</th>
                  <th>{t('admin.clientDocuments.colUpdated')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <div className="font-medium">{row.customerName || '—'}</div>
                      {(row.identityDocumentNumber || row.passportNumber) && (
                        <div className="text-xs text-[var(--admin-fg-muted)]">
                          {row.identityDocumentNumber || row.passportNumber}
                        </div>
                      )}
                    </td>
                    <td>{row.customerPhone || '—'}</td>
                    <td>
                      <span className="admin-badge admin-badge--success">{row.documentCount ?? 0}</span>
                    </td>
                    <td>{row.reservationCount || row.bookingIds?.length || 0}</td>
                    <td>{formatDate(row.updatedAt)}</td>
                    <td>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => openDetail(row)}>
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

      <AdminModal
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); setDetail(null); }}
        title={detail?.customerName || selected?.customerName || t('admin.clientDocuments.detailTitle')}
        variant="drawer"
        size="md"
      >
        {detailLoading ? (
          <div className="py-12 flex justify-center"><Loader /></div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.colPhone')}:</span> {detail.customerPhone || '—'}</p>
              {detail.identityDocumentNumber && (
                <p><span className="text-[var(--admin-fg-muted)]">{t('admin.walkIn.identityDocument')}:</span> {detail.identityDocumentNumber}</p>
              )}
              {detail.passportNumber && (
                <p><span className="text-[var(--admin-fg-muted)]">{t('admin.walkIn.passport')}:</span> {detail.passportNumber}</p>
              )}
              <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.colDocuments')}:</span> {detail.documentCount || 0}</p>
              <p><span className="text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.colReservations')}:</span> {detail.reservationCount || 0}</p>
            </div>

            {(detail.files?.length ? detail.files : detail.documentUrl ? [{ type: 'combined', url: detail.documentUrl, uploadedAt: detail.uploadedAt }] : []).map((file, idx) => (
              <div key={file._id || idx} className="rounded-xl border border-[var(--admin-border)] overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] px-3 py-2 bg-[var(--admin-bg-subtle)]">
                  <div>
                    <p className="text-sm font-medium">{t(DOC_TYPE_LABELS[file.type] || DOC_TYPE_LABELS.other)}</p>
                    <p className="text-xs text-[var(--admin-fg-muted)]">{formatDate(file.uploadedAt)}</p>
                  </div>
                  {file.url && (
                    <a href={file.url} target="_blank" rel="noreferrer" className="admin-btn admin-btn--ghost admin-btn--sm">
                      {t('admin.clientDocuments.download')}
                    </a>
                  )}
                </div>
                {file.url && (
                  <img src={file.url} alt="" className="max-h-64 w-full object-contain bg-[var(--admin-bg)]" />
                )}
              </div>
            ))}

            <label className="admin-btn admin-btn--primary admin-btn--sm cursor-pointer inline-flex">
              {replacing ? '…' : t('admin.clientDocuments.replaceCombined')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={replacing}
                onChange={(e) => replaceDocument(e.target.files?.[0])}
              />
            </label>

            {detail.bookings?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)] mb-2">
                  {t('admin.clientDocuments.relatedReservations')}
                </p>
                <ul className="space-y-2 text-sm">
                  {detail.bookings.map((b) => (
                    <li key={b._id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 flex flex-wrap items-center gap-2">
                      <Link to="/owner/manage-bookings" className="font-medium text-[var(--admin-accent)] hover:underline">
                        {b.reservationId}
                      </Link>
                      <span className="text-[var(--admin-fg-muted)]">{b.car?.brand} {b.car?.model}</span>
                      <span className="admin-badge admin-badge--ghost text-[10px]">{b.channel || 'online'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.clientDocuments.loadFailed')}</p>
        )}
      </AdminModal>
    </AdminPage>
  );
};

export default ClientDocuments;
