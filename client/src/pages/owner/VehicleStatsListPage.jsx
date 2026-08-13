import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { assets } from '../../assets/ownerAssets'
import { AdminPage, PageHeader, EmptyState, Skeleton } from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { formatLocationsDisplay } from '../../utils/carLocations'

const VehicleStatsListPage = () => {
  const navigate = useNavigate()
  const { isOwner, axios, currency } = useAppContext()
  const { t } = useI18n()
  const fallbackImage = assets.car_image1

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOwner) return

    const loadVehicles = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/cars')
        if (data.success) {
          setVehicles(data.cars || [])
        } else {
          toast.error(data.message || t('admin.vehicleStats.loadError'))
        }
      } catch (error) {
        toast.error(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    loadVehicles()
  }, [axios, isOwner, t])

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.vehicleStats.title')}
        description={`${t('admin.vehicleStats.subtitle')} ${t('admin.vehicleStats.summary', { count: vehicles.length })}`}
      />

      {loading ? (
        <Skeleton className="h-40 w-full rounded-[var(--admin-radius-lg)]" />
      ) : vehicles.length === 0 ? (
        <EmptyState title={t('admin.vehicleStats.none')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {vehicles.map((vehicle) => {
            const statusLabel = vehicle.status === 'maintenance'
              ? t('admin.vehicleStats.statusMaintenance')
              : vehicle.isAvaliable
                ? t('admin.vehicleStats.statusAvailable')
                : t('admin.vehicleStats.statusOffline')

            return (
              <div key={vehicle._id} className="admin-panel p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={vehicle.image || fallbackImage}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    onError={(e) => { e.currentTarget.src = fallbackImage }}
                    className="h-20 w-20 rounded-2xl object-cover shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--admin-fg)]">{vehicle.brand} {vehicle.model}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${vehicle.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : vehicle.isAvaliable ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--admin-surface-2)] text-[var(--admin-fg-muted)]'}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--admin-fg-secondary)]">
                      {t('admin.vehicleStats.fleetId')}: <span className="font-medium text-[var(--admin-fg)]">{vehicle.fleetId || '—'}</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
                      {t('admin.vehicleStats.plate')}: <span className="font-medium text-[var(--admin-fg)]">{vehicle.licensePlate || '—'}</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
                      {t('admin.vehicleStats.locations')}: <span className="font-medium text-[var(--admin-fg)]">{formatLocationsDisplay(vehicle) || '—'}</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
                      {t('admin.vehicleStats.price')}: <span className="font-medium text-[var(--admin-fg)]">{currency}{vehicle.pricePerDay}{t('admin.fleet.perDay')}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/owner/vehicle-stats/${vehicle._id}`)}
                    className="admin-btn admin-btn--primary"
                  >
                    {t('admin.vehicleStats.viewStats')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminPage>
  )
}

export default VehicleStatsListPage
