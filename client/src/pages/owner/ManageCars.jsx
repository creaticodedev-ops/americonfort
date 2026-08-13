import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../../assets/ownerAssets'
import StatusBadge from '../../components/owner/StatusBadge'
import {
  AdminPage,
  PageHeader,
  StatCard,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { VEHICLE_CATEGORIES } from '../../utils/vehicleCategories'
import { formatLocationsDisplay } from '../../utils/carLocations'

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
  const [filters, setFilters] = useState({
    search: '',
    fleetId: '',
    vin: '',
    plate: '',
    status: '',
    branch: '',
    category: '',
  })
  const [applied, setApplied] = useState(filters)

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

  const openVehicleStats = (car) => {
    navigate(`/owner/vehicle-stats/${car._id}`)
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

  const inputClass =
    'h-9 border border-[var(--admin-border)] rounded-[var(--admin-radius)] px-3 text-sm w-full min-w-0 outline-none bg-[var(--admin-surface)] text-[var(--admin-fg)] focus:shadow-[var(--admin-focus)]'

  const emptyFilters = {
    search: '',
    fleetId: '',
    vin: '',
    plate: '',
    status: '',
    branch: '',
    category: '',
  }

  const snapshot = useMemo(() => {
    const total = cars.length
    const available = cars.filter((c) => c.isAvaliable && c.status !== 'maintenance').length
    const maintenance = cars.filter((c) => c.status === 'maintenance').length
    const offline = cars.filter((c) => !c.isAvaliable && c.status !== 'maintenance').length
    return { total, available, maintenance, offline }
  }, [cars])

  const CarActions = ({ car }) => (
    <div className="admin-action-rail">
      <button type="button" className="admin-btn admin-btn--ghost" onClick={() => openVehicleStats(car)}>
        {t('admin.leftover.stats')}
      </button>
      <button type="button" className="admin-btn admin-btn--ghost" onClick={() => navigate(`/owner/edit-car/${car._id}`)}>
        {t('admin.common.edit')}
      </button>
      <button type="button" className="admin-btn admin-btn--ghost" onClick={() => toggleAvailability(car._id)}>
        {t('admin.fleet.toggle')}
      </button>
      <button
        type="button"
        disabled={togglingVisibilityId === car._id}
        className="admin-btn admin-btn--ghost"
        onClick={() => toggleWebsiteVisibility(car)}
      >
        {togglingVisibilityId === car._id
          ? t('admin.common.loading')
          : isVisibleOnWebsite(car)
            ? t('admin.fleet.hideFromWebsite')
            : t('admin.fleet.showOnWebsite')}
      </button>
      <Link to="/owner/maintenance" className="admin-btn admin-btn--ghost">
        {t('admin.menu.maintenance')}
      </Link>
      <Link to="/owner/accounting/vehicle-expenses" className="admin-btn admin-btn--ghost">
        {t('admin.fleetUi.expenses')}
      </Link>
      <button type="button" className="admin-btn admin-btn--danger" onClick={() => setConfirmDeleteId(car._id)}>
        {t('admin.common.delete')}
      </button>
    </div>
  )

  return (
    <AdminPage className="max-w-[1600px]">
      <PageHeader
        title={t('admin.fleet.title')}
        description={t('admin.fleet.subtitle')}
        actions={
          <Link to="/owner/add-car" className="admin-btn admin-btn--primary">
            {t('admin.menu.addCar')}
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('admin.fleetUi.totalCars')} value={snapshot.total} />
        <StatCard label={t('admin.fleetUi.available')} value={snapshot.available} tone="success" />
        <StatCard label={t('admin.fleetUi.offline')} value={snapshot.offline} tone="info" />
        <StatCard label={t('admin.fleetUi.maintenance')} value={snapshot.maintenance} tone="warning" to="/owner/maintenance" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setApplied({ ...filters })
        }}
        className="mb-4 grid grid-cols-1 gap-2 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          className={`${inputClass} lg:col-span-2`}
          placeholder={t('admin.fleet.searchAll')}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <input className={inputClass} placeholder={t('admin.fleet.fleetId')} value={filters.fleetId} onChange={(e) => setFilters({ ...filters, fleetId: e.target.value })} />
        <input className={inputClass} placeholder={t('admin.fleet.vin')} value={filters.vin} onChange={(e) => setFilters({ ...filters, vin: e.target.value })} />
        <input className={inputClass} placeholder={t('admin.fleet.plate')} value={filters.plate} onChange={(e) => setFilters({ ...filters, plate: e.target.value })} />
        <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">{t('admin.fleet.allStatuses')}</option>
          <option value="available">{t('admin.status.available')}</option>
          <option value="booked">{t('admin.status.booked')}</option>
          <option value="maintenance">{t('admin.fleetUi.inMaintenance')}</option>
        </select>
        <select className={inputClass} value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
          <option value="">{t('admin.fleet.allBranches')}</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select className={inputClass} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">{t('admin.fleet.allCategories')}</option>
          {VEHICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="admin-btn admin-btn--primary flex-1">{t('admin.fleet.apply')}</button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setFilters(emptyFilters)
              setApplied(emptyFilters)
            }}
          >
            {t('admin.fleet.clear')}
          </button>
        </div>
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
            <div className="divide-y divide-[var(--admin-border)] lg:hidden">
              {cars.map((car) => (
                <article key={car._id} className="space-y-3 p-4">
                  <div className="flex gap-3">
                    <img
                      src={car.image || fallbackImage}
                      onError={(e) => { e.currentTarget.src = fallbackImage }}
                      alt={`${car.brand} ${car.model}`}
                      className="h-16 w-16 shrink-0 rounded-[var(--admin-radius)] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-semibold text-[var(--admin-accent)]">{car.fleetId || '—'}</p>
                      <p className="truncate font-semibold text-[var(--admin-fg)]">{car.brand} {car.model}</p>
                      <p className="text-xs text-[var(--admin-fg-muted)]">{car.year} · {car.seating_capacity} seats · {car.category}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusBadge status={fleetStatus(car)} label={statusLabel(car, t)} />
                        <StatusBadge
                          status={isVisibleOnWebsite(car) ? 'active' : 'inactive'}
                          label={isVisibleOnWebsite(car) ? t('admin.fleet.visibleOnWebsite') : t('admin.fleet.hiddenFromWebsite')}
                        />
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {currency}{car.pricePerDay}
                      <span className="block text-[10px] font-normal text-[var(--admin-fg-muted)]">{t('admin.fleet.perDay')}</span>
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-[var(--admin-fg-muted)]">{t('admin.fleet.plate')}</dt>
                      <dd className="font-medium">{car.licensePlate || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--admin-fg-muted)]">{t('admin.fleet.mileage')}</dt>
                      <dd>{car.mileage || 0} km</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[var(--admin-fg-muted)]">{t('admin.fleet.locationsCol')}</dt>
                      <dd className="truncate">{formatLocationsDisplay(car)}</dd>
                    </div>
                  </dl>
                  <CarActions car={car} />
                </article>
              ))}
            </div>

            <div className="table-scroll hidden max-h-[min(70vh,44rem)] overflow-auto lg:block">
              <table className="admin-table min-w-[960px]">
                <thead>
                  <tr>
                    <th>{t('admin.fleet.fleetId')}</th>
                    <th>{t('admin.fleet.car')}</th>
                    <th>{t('admin.fleet.plate')}</th>
                    <th>{t('admin.fleet.locationsCol')}</th>
                    <th>{t('admin.fleet.price')}</th>
                    <th>{t('admin.fleet.status')}</th>
                    <th>{t('admin.fleet.website')}</th>
                    <th>{t('admin.fleet.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car) => (
                    <tr key={car._id}>
                      <td className="whitespace-nowrap font-mono text-xs font-semibold text-[var(--admin-accent)]">{car.fleetId || '—'}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={car.image || fallbackImage}
                            onError={(e) => { e.currentTarget.src = fallbackImage }}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-[var(--admin-radius)] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{car.brand} {car.model}</p>
                            <p className="text-xs text-[var(--admin-fg-muted)]">{car.year} · {car.category} · {car.mileage || 0} km</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-medium">{car.licensePlate || '—'}</td>
                      <td className="max-w-[160px]">
                        <p className="truncate text-sm">{formatLocationsDisplay(car)}</p>
                        {car.branch ? <p className="truncate text-xs text-[var(--admin-fg-muted)]">{car.branch}</p> : null}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {currency}{car.pricePerDay}{t('admin.fleet.perDay')}
                      </td>
                      <td><StatusBadge status={fleetStatus(car)} label={statusLabel(car, t)} /></td>
                      <td>
                        <StatusBadge
                          status={isVisibleOnWebsite(car) ? 'active' : 'inactive'}
                          label={isVisibleOnWebsite(car) ? t('admin.fleet.visibleOnWebsite') : t('admin.fleet.hiddenFromWebsite')}
                        />
                      </td>
                      <td><CarActions car={car} /></td>
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
