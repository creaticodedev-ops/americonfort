import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../../assets/ownerAssets'
import StatusBadge from '../../components/owner/StatusBadge'
import BookingActionsMenu from '../../components/owner/booking/BookingActionsMenu'
import {
  AdminPage,
  PageHeader,
  StatCard,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
  FilterBar,
  SearchInput,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { VEHICLE_CATEGORIES } from '../../utils/vehicleCategories'
import { formatLocationsDisplay } from '../../utils/carLocations'

const emptyFilters = {
  search: '',
  fleetId: '',
  vin: '',
  plate: '',
  status: '',
  branch: '',
  category: '',
}

const fleetStatus = (car) => {
  if (car.status === 'maintenance') return 'maintenance'
  if (car.isAvaliable) return 'active'
  return 'inactive'
}

const statusLabel = (car, t) => {
  if (car.status === 'maintenance') return t('admin.fleet.statusMaintenance')
  if (car.isAvaliable) return t('admin.fleet.statusAvailable')
  return t('admin.fleet.statusOffline')
}

const isVisibleOnWebsite = (car) => car.visibleOnWebsite !== false

const extraFilterKeys = ['fleetId', 'vin', 'plate']

const countExtraFilters = (source) => extraFilterKeys.filter((key) => source[key]).length

const VehicleIdentity = ({ car, fallbackImage, size = 'md', className = '' }) => (
  <div className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
    <img
      src={car.image || fallbackImage}
      onError={(e) => { e.currentTarget.src = fallbackImage }}
      alt={`${car.brand} ${car.model}`}
      className={size === 'lg' ? 'admin-fleet-thumb admin-fleet-thumb--lg' : 'admin-fleet-thumb'}
    />
    <div className="min-w-0">
      <p className="truncate font-medium text-[var(--admin-fg)]">{car.brand} {car.model}</p>
      <p className="truncate text-xs text-[var(--admin-fg-muted)]">
        {car.year} · {car.category} · {car.mileage || 0} km
      </p>
      <p className="admin-fleet-id mt-0.5 truncate">{car.fleetId || '—'}</p>
    </div>
  </div>
)

const FleetRowActions = ({
  t,
  car,
  websiteBusy,
  onEdit,
  onStats,
  onToggle,
  onWebsite,
  onMaintenance,
  onExpenses,
  onDelete,
}) => (
  <div className="flex items-center justify-end gap-1.5">
    <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onEdit}>
      {t('admin.common.edit')}
    </button>
    <BookingActionsMenu
      t={t}
      showView={false}
      size="sm"
      items={[
        { key: 'stats', label: t('admin.leftover.stats'), onClick: onStats },
        { key: 'toggle', label: t('admin.fleet.toggle'), onClick: onToggle },
        {
          key: 'website',
          label: isVisibleOnWebsite(car) ? t('admin.fleet.hideFromWebsite') : t('admin.fleet.showOnWebsite'),
          onClick: onWebsite,
          disabled: websiteBusy,
        },
        { key: 'maintenance', label: t('admin.menu.maintenance'), onClick: onMaintenance },
        { key: 'expenses', label: t('admin.fleetUi.expenses'), onClick: onExpenses },
        { key: 'delete', label: t('admin.common.delete'), tone: 'danger', onClick: onDelete },
      ]}
    />
  </div>
)

const ManageCars = () => {
  const { isOwner, axios, currency } = useAppContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const fallbackImage = assets.car_image1

  const [cars, setCars] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [togglingVisibilityId, setTogglingVisibilityId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(applied).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    return params.toString()
  }, [applied])

  const fetchOwnerCars = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/owner/cars${query ? `?${query}` : ''}`)
      if (data.success) {
        setCars(data.cars)
        setBranches(data.branches || [])
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (carId) => {
    try {
      const { data } = await axios.post('/api/owner/toggle-car', { carId })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const toggleWebsiteVisibility = async (car) => {
    const currentlyVisible = isVisibleOnWebsite(car)
    const confirmMsg = currentlyVisible
      ? t('admin.fleet.hideConfirm', { name: `${car.brand} ${car.model}` })
      : t('admin.fleet.showConfirm', { name: `${car.brand} ${car.model}` })
    if (!window.confirm(confirmMsg)) return

    setTogglingVisibilityId(car._id)
    try {
      const { data } = await axios.post('/api/owner/toggle-car-visibility', {
        carId: car._id,
        visibleOnWebsite: !currentlyVisible,
      })
      if (data.success) {
        toast.success(data.message)
        setCars((list) =>
          list.map((item) =>
            item._id === car._id
              ? { ...item, visibleOnWebsite: data.car?.visibleOnWebsite }
              : item,
          ),
        )
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setTogglingVisibilityId('')
    }
  }

  const deleteCar = async () => {
    const carId = confirmDeleteId
    setConfirmDeleteId(null)
    if (!carId) return
    try {
      const { data } = await axios.post('/api/owner/delete-car', { carId })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  useEffect(() => {
    if (isOwner) fetchOwnerCars()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, query])

  const snapshot = useMemo(() => {
    const total = cars.length
    const available = cars.filter((c) => c.isAvaliable && c.status !== 'maintenance').length
    const maintenance = cars.filter((c) => c.status === 'maintenance').length
    const offline = cars.filter((c) => !c.isAvaliable && c.status !== 'maintenance').length
    return { total, available, maintenance, offline }
  }, [cars])

  const extraFilterCount = countExtraFilters(applied)
  const patch = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))

  const applyFilters = (event) => {
    event?.preventDefault?.()
    setApplied({ ...filters })
    if (countExtraFilters(filters)) setShowMoreFilters(true)
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    setApplied(emptyFilters)
    setShowMoreFilters(false)
  }

  const rowActions = (car) => (
    <FleetRowActions
      t={t}
      car={car}
      websiteBusy={togglingVisibilityId === car._id}
      onEdit={() => navigate(`/owner/edit-car/${car._id}`)}
      onStats={() => navigate(`/owner/vehicle-stats/${car._id}`)}
      onToggle={() => toggleAvailability(car._id)}
      onWebsite={() => toggleWebsiteVisibility(car)}
      onMaintenance={() => navigate('/owner/maintenance')}
      onExpenses={() => navigate('/owner/accounting/vehicle-expenses')}
      onDelete={() => setConfirmDeleteId(car._id)}
    />
  )

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.fleet.title')}
        description={t('admin.fleet.subtitle')}
        actions={
          <Link to="/owner/add-car" className="admin-btn admin-btn--primary">
            {t('admin.menu.addCar')}
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard compact label={t('admin.fleetUi.totalCars')} value={snapshot.total} />
        <StatCard compact label={t('admin.fleetUi.available')} value={snapshot.available} tone="success" />
        <StatCard compact label={t('admin.fleetUi.offline')} value={snapshot.offline} tone="info" />
        <StatCard compact label={t('admin.fleetUi.maintenance')} value={snapshot.maintenance} tone="warning" to="/owner/maintenance" />
      </div>

      <form onSubmit={applyFilters}>
        <FilterBar className="admin-filter-bar--stack">
          <div className="admin-filter-bar-row">
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
              placeholder={t('admin.fleet.searchAll')}
              className="sm:max-w-sm"
            />
            <select className="admin-form-control" value={filters.status} onChange={patch('status')} aria-label={t('admin.fleet.status')}>
              <option value="">{t('admin.fleet.allStatuses')}</option>
              <option value="available">{t('admin.status.available')}</option>
              <option value="booked">{t('admin.status.booked')}</option>
              <option value="maintenance">{t('admin.fleetUi.inMaintenance')}</option>
            </select>
            <select className="admin-form-control" value={filters.branch} onChange={patch('branch')} aria-label={t('admin.fleet.branch')}>
              <option value="">{t('admin.fleet.allBranches')}</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select className="admin-form-control" value={filters.category} onChange={patch('category')} aria-label={t('admin.fleet.category')}>
              <option value="">{t('admin.fleet.allCategories')}</option>
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="admin-filter-bar-actions">
              <button
                type="button"
                className={extraFilterCount ? 'admin-btn admin-btn--secondary' : 'admin-btn admin-btn--ghost'}
                onClick={() => setShowMoreFilters((v) => !v)}
              >
                {showMoreFilters ? t('admin.fleet.lessFilters') : t('admin.fleet.moreFilters')}
                {extraFilterCount > 0 ? ` (${extraFilterCount})` : ''}
              </button>
              <button type="submit" className="admin-btn admin-btn--primary">{t('admin.fleet.apply')}</button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={clearFilters}>
                {t('admin.fleet.clear')}
              </button>
            </div>
          </div>

          {showMoreFilters && (
            <div className="admin-filter-more">
              <input className="admin-form-control" placeholder={t('admin.fleet.fleetId')} value={filters.fleetId} onChange={patch('fleetId')} aria-label={t('admin.fleet.fleetId')} />
              <input className="admin-form-control" placeholder={t('admin.fleet.vin')} value={filters.vin} onChange={patch('vin')} aria-label={t('admin.fleet.vin')} />
              <input className="admin-form-control" placeholder={t('admin.fleet.plate')} value={filters.plate} onChange={patch('plate')} aria-label={t('admin.fleet.plate')} />
            </div>
          )}
        </FilterBar>
      </form>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : cars.length === 0 ? (
          <EmptyState
            icon="car"
            title={t('admin.fleet.none')}
            description={t('admin.leftover.addFirstVehicle')}
            action={<Link to="/owner/add-car" className="admin-btn admin-btn--primary">{t('admin.menu.addCar')}</Link>}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-2.5">
              <p className="text-xs text-[var(--admin-fg-muted)]">{t('admin.fleet.showingCount', { count: cars.length })}</p>
            </div>

            <div className="divide-y divide-[var(--admin-border)] lg:hidden">
              {cars.map((car) => (
                <article key={car._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <VehicleIdentity car={car} fallbackImage={fallbackImage} size="lg" className="min-w-0 flex-1" />
                    <p className="shrink-0 text-end text-sm font-semibold tabular-nums">
                      {currency}{car.pricePerDay}
                      <span className="block text-[10px] font-normal text-[var(--admin-fg-muted)]">{t('admin.fleet.perDay')}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={fleetStatus(car)} label={statusLabel(car, t)} />
                    <StatusBadge
                      status={isVisibleOnWebsite(car) ? 'active' : 'inactive'}
                      label={isVisibleOnWebsite(car) ? t('admin.fleet.websiteOn') : t('admin.fleet.websiteOff')}
                    />
                    <span className="text-xs font-medium text-[var(--admin-fg)]">{car.licensePlate || '—'}</span>
                    <span className="min-w-0 truncate text-xs text-[var(--admin-fg-muted)]">{formatLocationsDisplay(car)}</span>
                  </div>
                  <div className="mt-3">
                    {rowActions(car)}
                  </div>
                </article>
              ))}
            </div>

            <div className="table-scroll hidden max-h-[min(70vh,44rem)] overflow-auto lg:block">
              <table className="admin-table min-w-[880px]">
                <thead>
                  <tr>
                    <th>{t('admin.fleet.car')}</th>
                    <th>{t('admin.fleet.plate')}</th>
                    <th>{t('admin.fleet.locationsCol')}</th>
                    <th>{t('admin.fleet.price')}</th>
                    <th>{t('admin.fleet.status')}</th>
                    <th>{t('admin.fleet.website')}</th>
                    <th className="text-end">{t('admin.fleet.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car) => (
                    <tr key={car._id}>
                      <td className="min-w-[16rem]"><VehicleIdentity car={car} fallbackImage={fallbackImage} /></td>
                      <td className="whitespace-nowrap font-medium">{car.licensePlate || '—'}</td>
                      <td className="max-w-[180px]">
                        <p className="truncate text-sm">{formatLocationsDisplay(car)}</p>
                        {car.branch ? <p className="truncate text-xs text-[var(--admin-fg-muted)]">{car.branch}</p> : null}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {currency}{car.pricePerDay}
                        <span className="text-[var(--admin-fg-muted)]">{t('admin.fleet.perDay')}</span>
                      </td>
                      <td><StatusBadge status={fleetStatus(car)} label={statusLabel(car, t)} /></td>
                      <td>
                        <StatusBadge
                          status={isVisibleOnWebsite(car) ? 'active' : 'inactive'}
                          label={isVisibleOnWebsite(car) ? t('admin.fleet.websiteOn') : t('admin.fleet.websiteOff')}
                        />
                      </td>
                      <td>{rowActions(car)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title={t('admin.fleetUi.removeVehicle')}
        message={t('admin.fleetUi.removeConfirm')}
        confirmText={t('admin.common.delete')}
        variant="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={deleteCar}
      />
    </AdminPage>
  )
}

export default ManageCars
