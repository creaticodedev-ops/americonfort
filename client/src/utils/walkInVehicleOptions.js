/**
 * Build Walk-in vehicle selector options from fleet-availability API rows.
 */

const LOCALE_BY_LANG = {
  en: 'en-GB',
  fr: 'fr-FR',
  es: 'es-ES',
  ar: 'ar-MA',
}

export const formatWalkInDateTime = (value, language = 'en') => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[language] || language || 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

const plateLabel = (car, t) => {
  const plate = String(car.licensePlate || '').trim()
  if (!plate) return t('admin.walkIn.noPlate')
  return t('admin.walkIn.vehiclePlate', { plate })
}

/**
 * @returns {{ label: string, tone: string, detail?: string, tooltip: string }}
 */
export const buildVehicleAvailabilityStatus = (car, { t, language, datesReady }) => {
  const when = formatWalkInDateTime(car?.conflict?.returnDate, language)
  const reservation = car?.conflict?.reservationId
  const customer = car?.conflict?.customerName

  switch (car?.availability) {
    case 'available':
      return {
        tone: 'available',
        label: t('admin.walkIn.vehicleStatus.available'),
        detail: datesReady ? undefined : t('admin.walkIn.vehicleStatus.setDatesHint'),
        tooltip: datesReady
          ? t('admin.walkIn.vehicleStatus.availableTooltip')
          : t('admin.walkIn.vehicleStatus.setDatesTooltip'),
      }
    case 'reserved':
      return {
        tone: 'reserved',
        label: t('admin.walkIn.vehicleStatus.reserved'),
        detail: when
          ? t('admin.walkIn.vehicleStatus.until', { when })
          : undefined,
        tooltip: t('admin.walkIn.vehicleStatus.reservedTooltip', {
          when: when || '—',
          reservation: reservation || '—',
          customer: customer || '—',
        }),
      }
    case 'on_rent':
      return {
        tone: 'on_rent',
        label: t('admin.walkIn.vehicleStatus.onRent'),
        detail: when
          ? t('admin.walkIn.vehicleStatus.expectedReturn', { when })
          : undefined,
        tooltip: t('admin.walkIn.vehicleStatus.onRentTooltip', {
          when: when || '—',
          reservation: reservation || '—',
          customer: customer || '—',
        }),
      }
    case 'maintenance':
      return {
        tone: 'maintenance',
        label: t('admin.walkIn.vehicleStatus.maintenance'),
        detail: t('admin.walkIn.vehicleStatus.workshop'),
        tooltip: t('admin.walkIn.vehicleStatus.maintenanceTooltip'),
      }
    case 'unavailable':
    default:
      return {
        tone: 'unavailable',
        label: t('admin.walkIn.vehicleStatus.unavailable'),
        detail: t('admin.walkIn.vehicleStatus.offline'),
        tooltip: t('admin.walkIn.vehicleStatus.unavailableTooltip'),
      }
  }
}

export const buildWalkInVehicleOptions = (cars, { currency, t, language, datesReady }) =>
  (cars || []).map((c) => {
    const title = [c.brand, c.model].filter(Boolean).join(' ').trim() || '—'
    const plate = String(c.licensePlate || '').trim()
    const status = buildVehicleAvailabilityStatus(c, { t, language, datesReady })
    const metaParts = [
      c.pricePerDay != null ? `${currency}${c.pricePerDay}/day` : null,
      c.branch || null,
      c.fleetId ? String(c.fleetId) : null,
    ].filter(Boolean)

    return {
      value: c._id,
      label: title,
      description: plateLabel(c, t),
      meta: metaParts.join(' · '),
      searchText: [title, plate, c.fleetId, c.branch, c.category, status.label].filter(Boolean).join(' '),
      disabled: !c.selectable,
      status: {
        tone: status.tone,
        label: status.label,
        detail: status.detail,
      },
      tooltip: status.tooltip,
      availability: c.availability,
    }
  })

export default {
  formatWalkInDateTime,
  buildVehicleAvailabilityStatus,
  buildWalkInVehicleOptions,
}
