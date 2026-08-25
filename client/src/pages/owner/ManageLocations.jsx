import React, { useCallback, useEffect, useMemo, useState } from 'react'
import StatusBadge from '../../components/owner/StatusBadge'
import BookingActionsMenu from '../../components/owner/booking/BookingActionsMenu'
import {
  AdminPage,
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  SkeletonRows,
  AdminModal,
  AdminForm,
  AdminFormSection,
  AdminFormField,
  AdminFormInput,
  AdminFormSelect,
  AdminFormGrid,
  ConfirmDialog,
  FilterBar,
  SearchInput,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const emptyForm = {
  name: '',
  city: '',
  address: '',
  googleMapsLink: '',
  locationType: 'custom',
  deliveryFee: '0',
}

const TYPE_ORDER = ['airport', 'hotel', 'office', 'custom']

const typeLabel = (type, t) => {
  switch (type) {
    case 'airport':
      return t('admin.locations.typeAirport')
    case 'hotel':
      return t('admin.locations.typeHotel')
    case 'office':
      return t('admin.locations.typeOffice')
    default:
      return t('admin.locations.typeCustom')
  }
}

function LocationForm({ form, patchForm, money, t }) {
  return (
    <AdminFormSection>
      <AdminFormGrid columns={2}>
        <AdminFormField label={t('admin.locations.name')} required>
          <AdminFormInput
            required
            placeholder={t('admin.locUi.namePh')}
            value={form.name}
            onChange={(e) => patchForm({ name: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.locations.city')} required>
          <AdminFormInput
            required
            placeholder={t('admin.locUi.cityPh')}
            value={form.city}
            onChange={(e) => patchForm({ city: e.target.value })}
            autoComplete="address-level2"
          />
        </AdminFormField>
      </AdminFormGrid>
      <AdminFormField label={t('admin.locations.address')} required>
        <AdminFormInput
          required
          placeholder={t('admin.locUi.addressPh')}
          value={form.address}
          onChange={(e) => patchForm({ address: e.target.value })}
          autoComplete="street-address"
        />
      </AdminFormField>
      <AdminFormGrid columns={2}>
        <AdminFormField label={t('admin.locations.mapsLink')} hint={t('admin.locations.mapsLinkHint')}>
          <AdminFormInput
            type="url"
            inputMode="url"
            placeholder="https://maps.google.com/..."
            value={form.googleMapsLink}
            onChange={(e) => patchForm({ googleMapsLink: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.locations.type')}>
          <AdminFormSelect
            value={form.locationType}
            onChange={(e) => patchForm({ locationType: e.target.value })}
          >
            <option value="airport">{t('admin.locations.typeAirport')}</option>
            <option value="hotel">{t('admin.locations.typeHotel')}</option>
            <option value="office">{t('admin.locations.typeOffice')}</option>
            <option value="custom">{t('admin.locations.typeCustom')}</option>
          </AdminFormSelect>
        </AdminFormField>
      </AdminFormGrid>
      <AdminFormField label={t('admin.locations.deliveryFee')} hint={t('admin.locations.deliveryFeeHint')}>
        <div className="admin-loc-fee-input">
          <AdminFormInput
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            value={form.deliveryFee}
            onChange={(e) => patchForm({ deliveryFee: e.target.value })}
          />
          <span>{money}</span>
        </div>
      </AdminFormField>
    </AdminFormSection>
  )
}

const LocationTypeChip = ({ type, t }) => (
  <span className={`admin-loc-type admin-loc-type--${type || 'custom'}`}>
    {typeLabel(type, t)}
  </span>
)

const ManageLocations = () => {
  const { isOwner, axios, fetchPickupLocations, currency } = useAppContext()
  const { t } = useI18n()

  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const patchForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])
  const [editingId, setEditingId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [togglingId, setTogglingId] = useState('')

  const money = currency || 'MAD '

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { data } = await axios.get('/api/pickup-locations/all')
      if (data.success) {
        setLocations(data.locations || [])
      } else {
        setLoadError(data.message || t('admin.locations.loadError'))
        toast.error(data.message)
      }
    } catch (error) {
      const msg = getErrorMessage(error)
      setLoadError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [axios, t])

  const resetForm = useCallback(() => {
    setForm(emptyForm)
    setEditingId(null)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    resetForm()
  }, [resetForm])

  const openAdd = useCallback(() => {
    resetForm()
    setDrawerOpen(true)
  }, [resetForm])

  const startEdit = useCallback((location) => {
    setEditingId(location._id)
    setForm({
      name: location.name,
      city: location.city,
      address: location.address,
      googleMapsLink: location.googleMapsLink || '',
      locationType: location.locationType || 'custom',
      deliveryFee: String(location.deliveryFee ?? 0),
    })
    setDrawerOpen(true)
  }, [])

  const save = useCallback(async () => {
    if (isSaving) return

    const fee = Number(form.deliveryFee)
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error(t('admin.locations.invalidFee'))
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: form.name,
        city: form.city,
        address: form.address,
        googleMapsLink: form.googleMapsLink,
        locationType: form.locationType,
        deliveryFee: fee,
      }
      const endpoint = editingId ? '/api/pickup-locations/update' : '/api/pickup-locations/create'
      const body = editingId ? { locationId: editingId, ...payload } : payload
      const { data } = await axios.post(endpoint, body)

      if (data.success) {
        toast.success(data.message)
        closeDrawer()
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [axios, closeDrawer, editingId, form, isSaving, t, fetchPickupLocations, fetchLocations])

  const toggleLocation = async (location) => {
    if (!location?._id || togglingId) return
    setTogglingId(location._id)
    try {
      const { data } = await axios.post('/api/pickup-locations/toggle', { locationId: location._id })
      if (data.success) {
        toast.success(data.message)
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setTogglingId('')
    }
  }

  const runDelete = async () => {
    if (!confirmDeleteId || confirmBusy) return
    setConfirmBusy(true)
    try {
      const { data } = await axios.post('/api/pickup-locations/delete', { locationId: confirmDeleteId })
      if (data.success) {
        toast.success(data.message)
        if (editingId === confirmDeleteId) closeDrawer()
        setConfirmDeleteId(null)
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setConfirmBusy(false)
    }
  }

  useEffect(() => {
    if (isOwner) fetchLocations()
  }, [isOwner, fetchLocations])

  const stats = useMemo(() => {
    const total = locations.length
    const active = locations.filter((l) => l.isActive).length
    const inactive = total - active
    const free = locations.filter((l) => Number(l.deliveryFee) <= 0).length
    return { total, active, inactive, free }
  }, [locations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return locations
      .filter((loc) => {
        if (typeFilter !== 'all' && (loc.locationType || 'custom') !== typeFilter) return false
        if (statusFilter === 'active' && !loc.isActive) return false
        if (statusFilter === 'inactive' && loc.isActive) return false
        if (!q) return true
        const hay = [loc.name, loc.city, loc.address, loc.locationType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const byActive = Number(b.isActive) - Number(a.isActive)
        if (byActive) return byActive
        const ta = TYPE_ORDER.indexOf(a.locationType || 'custom')
        const tb = TYPE_ORDER.indexOf(b.locationType || 'custom')
        if (ta !== tb) return ta - tb
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
  }, [locations, search, typeFilter, statusFilter])

  const hasFilters = Boolean(search.trim() || typeFilter !== 'all' || statusFilter !== 'all')

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  const typeOptions = useMemo(
    () => [
      { id: 'all', label: t('admin.locations.filterAllTypes') },
      { id: 'airport', label: t('admin.locations.typeAirport') },
      { id: 'hotel', label: t('admin.locations.typeHotel') },
      { id: 'office', label: t('admin.locations.typeOffice') },
      { id: 'custom', label: t('admin.locations.typeCustom') },
    ],
    [t],
  )

  const statusOptions = useMemo(
    () => [
      { id: 'all', label: t('admin.locations.filterAllStatus') },
      { id: 'active', label: t('admin.locations.active') },
      { id: 'inactive', label: t('admin.locations.inactive') },
    ],
    [t],
  )

  const drawerFooter = useMemo(
    () => (
      <>
        <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={closeDrawer}>
          {t('admin.common.cancel')}
        </button>
        <button
          type="button"
          disabled={isSaving}
          className="admin-btn admin-btn--primary admin-modal-action"
          onClick={save}
        >
          {isSaving
            ? t('admin.locations.saving')
            : editingId
              ? t('admin.locations.update')
              : t('admin.locations.add')}
        </button>
      </>
    ),
    [closeDrawer, editingId, isSaving, save, t],
  )

  const buildRowActions = (location) => [
    {
      key: 'toggle',
      label: location.isActive ? t('admin.locations.deactivate') : t('admin.locations.activate'),
      onClick: () => toggleLocation(location),
      disabled: togglingId === location._id,
    },
    location.googleMapsLink
      ? {
          key: 'maps',
          label: t('admin.locations.openMaps'),
          onClick: () => window.open(location.googleMapsLink, '_blank', 'noopener,noreferrer'),
        }
      : null,
    {
      key: 'delete',
      label: t('admin.common.delete'),
      tone: 'danger',
      onClick: () => setConfirmDeleteId(location._id),
    },
  ].filter(Boolean)

  const renderFee = (location) => {
    const fee = Number(location.deliveryFee) || 0
    if (fee <= 0) {
      return <span className="admin-loc-fee admin-loc-fee--free">{t('admin.locations.free')}</span>
    }
    return (
      <span className="admin-loc-fee">
        {money}
        {fee.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
    )
  }

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.locations.title')}
        description={t('admin.locations.subtitle')}
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={openAdd}>
            {t('admin.locations.add')}
          </button>
        }
      />

      <div className="admin-loc-stats">
        <StatCard compact label={t('admin.locations.statTotal')} value={stats.total} />
        <StatCard compact label={t('admin.locations.statActive')} value={stats.active} tone="success" />
        <StatCard compact label={t('admin.locations.statInactive')} value={stats.inactive} tone="info" />
        <StatCard compact label={t('admin.locations.statFree')} value={stats.free} tone="warning" />
      </div>

      <FilterBar className="admin-loc-filters admin-filter-bar--stack">
        <div className="admin-filter-bar-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('admin.locations.searchPlaceholder')}
            className="admin-loc-search"
          />
          <AdminFormSelect
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label={t('admin.locations.colType')}
            className="admin-loc-select"
          >
            {typeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </AdminFormSelect>
          <AdminFormSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('admin.locations.colStatus')}
            className="admin-loc-select"
          >
            {statusOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </AdminFormSelect>
          {hasFilters ? (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={clearFilters}>
              {t('admin.locations.clearFilters')}
            </button>
          ) : null}
        </div>
      </FilterBar>

      <div className="admin-loc-panel">
        <div className="admin-loc-panel__head">
          <div>
            <h2 className="admin-loc-panel__title">{t('admin.locations.listTitle')}</h2>
            <p className="admin-loc-panel__meta">
              {t('admin.locations.showing', { count: filtered.length, total: locations.length })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-loc-panel__body">
            <SkeletonRows rows={6} />
          </div>
        ) : loadError && locations.length === 0 ? (
          <div className="admin-loc-panel__body">
            <ErrorState
              title={t('admin.locations.loadError')}
              description={loadError}
              onRetry={fetchLocations}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-loc-panel__body">
            <EmptyState
              icon="building"
              title={hasFilters ? t('admin.locations.emptyFilteredTitle') : t('admin.locations.emptyTitle')}
              description={
                hasFilters
                  ? t('admin.locations.emptyFilteredDesc')
                  : t('admin.locations.emptyDesc')
              }
              action={
                hasFilters ? (
                  <button type="button" className="admin-btn admin-btn--secondary" onClick={clearFilters}>
                    {t('admin.locations.clearFilters')}
                  </button>
                ) : (
                  <button type="button" className="admin-btn admin-btn--primary" onClick={openAdd}>
                    {t('admin.locations.add')}
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="admin-loc-card-list">
              {filtered.map((location) => (
                <article
                  key={location._id}
                  className={`admin-loc-card${location.isActive ? '' : ' is-inactive'}`}
                >
                  <div className="admin-loc-card__main">
                    <div className="admin-loc-card__top">
                      <div className="min-w-0">
                        <p className="admin-loc-card__name">{location.name}</p>
                        <p className="admin-loc-card__address">{location.address}</p>
                      </div>
                      <StatusBadge
                        status={location.isActive ? 'active' : 'inactive'}
                        label={location.isActive ? t('admin.locations.active') : t('admin.locations.inactive')}
                      />
                    </div>
                    <div className="admin-loc-card__meta">
                      <span>{location.city || '—'}</span>
                      <LocationTypeChip type={location.locationType} t={t} />
                      {renderFee(location)}
                    </div>
                  </div>
                  <div className="admin-loc-card__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => startEdit(location)}
                    >
                      {t('admin.common.edit')}
                    </button>
                    <BookingActionsMenu
                      t={t}
                      showView={false}
                      size="sm"
                      items={buildRowActions(location)}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="admin-loc-table-wrap">
              <div className="table-scroll">
                <table className="admin-table admin-loc-table">
                  <thead>
                    <tr>
                      <th>{t('admin.locations.colLocation')}</th>
                      <th>{t('admin.locations.colCity')}</th>
                      <th>{t('admin.locations.colType')}</th>
                      <th>{t('admin.locations.colFee')}</th>
                      <th>{t('admin.locations.colStatus')}</th>
                      <th className="text-end">{t('admin.locations.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((location) => (
                      <tr key={location._id} className={location.isActive ? '' : 'is-inactive'}>
                        <td>
                          <div className="admin-loc-identity">
                            <p className="admin-loc-identity__name">{location.name}</p>
                            <p className="admin-loc-identity__address">{location.address}</p>
                          </div>
                        </td>
                        <td>
                          <span className="admin-loc-city">{location.city || '—'}</span>
                        </td>
                        <td>
                          <LocationTypeChip type={location.locationType} t={t} />
                        </td>
                        <td>{renderFee(location)}</td>
                        <td>
                          <StatusBadge
                            status={location.isActive ? 'active' : 'inactive'}
                            label={location.isActive ? t('admin.locations.active') : t('admin.locations.inactive')}
                          />
                        </td>
                        <td className="text-end">
                          <div className="admin-loc-row-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--sm"
                              onClick={() => startEdit(location)}
                            >
                              {t('admin.common.edit')}
                            </button>
                            <BookingActionsMenu
                              t={t}
                              showView={false}
                              size="sm"
                              items={buildRowActions(location)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AdminModal
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingId ? t('admin.locations.update') : t('admin.locations.add')}
        description={editingId ? t('admin.locations.editHint') : t('admin.locations.addHint')}
        variant="drawer"
        footer={drawerFooter}
      >
        <AdminForm>
          <LocationForm form={form} patchForm={patchForm} money={money} t={t} />
        </AdminForm>
      </AdminModal>

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title={t('admin.locations.deleteTitle')}
        message={t('admin.locations.deleteConfirm')}
        confirmText={t('admin.common.delete')}
        variant="danger"
        loading={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return
          setConfirmDeleteId(null)
        }}
        onConfirm={runDelete}
      />
    </AdminPage>
  )
}

export default ManageLocations
