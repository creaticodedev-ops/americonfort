import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import ChannelBadge from '../../components/owner/ChannelBadge'
import StatusBadge from '../../components/owner/StatusBadge'
import {
  AdminPage,
  PageHeader,
  SegmentedControl,
  EmptyState,
  Skeleton,
  AdminModal,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import {
  bookingsOnDay,
  buildMonthGrid,
  carKey,
  densityLevel,
  detectConflictIds,
  formatDayMonth,
  formatShortTime,
  isPickupDay,
  isReturnDay,
  isSameMonth,
  localeTag,
  sameDay,
  startOfDay,
  statusTone,
  vehicleLabel,
  vehiclesInRange,
  weekStartingSunday,
} from '../../utils/bookingCalendarUtils'
import '../../styles/booking-calendar.css'

const VIEW_IDS = [
  { id: 'month', labelKey: 'admin.calendar.month' },
  { id: 'week', labelKey: 'admin.calendar.week' },
  { id: 'day', labelKey: 'admin.calendar.day' },
]

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const BookingCalendar = () => {
  const { axios } = useAppContext()
  const { t, language } = useI18n()
  const now = useMemo(() => new Date(), [])
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()))
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [dayDrawer, setDayDrawer] = useState(null)
  const [tip, setTip] = useState(null)
  const tipTimer = useRef(null)

  const month = cursor.getMonth() + 1
  const year = cursor.getFullYear()
  const loc = localeTag(language)

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true)
      try {
        const months =
          view === 'month'
            ? [month]
            : [month === 1 ? 12 : month - 1, month, month === 12 ? 1 : month + 1]
        const yearsFor = months.map((m, i) => {
          if (view === 'month') return year
          if (i === 0 && month === 1) return year - 1
          if (i === 2 && month === 12) return year + 1
          return year
        })

        const responses = await Promise.all(
          [...new Set(months.map((m, i) => `${yearsFor[i]}-${m}`))].map(async (key) => {
            const [y, m] = key.split('-').map(Number)
            const { data } = await axios.get(`/api/bookings/owner/calendar?month=${m}&year=${y}`)
            return data.success ? data.bookings : []
          }),
        )
        const merged = []
        const seen = new Set()
        for (const list of responses) {
          for (const b of list) {
            if (!seen.has(b._id)) {
              seen.add(b._id)
              merged.push(b)
            }
          }
        }
        setBookings(merged)
      } catch (error) {
        toast.error(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }
    fetchCalendar()
  }, [month, year, view, axios])

  const conflictIds = useMemo(() => detectConflictIds(bookings), [bookings])

  const shift = (delta) => {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() + delta)
    else if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    const next = startOfDay(d)
    setCursor(next)
    setSelectedDay(next)
  }

  const goToday = () => {
    const today = startOfDay(new Date())
    setCursor(today)
    setSelectedDay(today)
  }

  const weekDays = useMemo(() => weekStartingSunday(cursor), [cursor])
  const monthGrid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  )

  const headerLabel = useMemo(() => {
    if (view === 'month') {
      return cursor.toLocaleString(loc, { month: 'long', year: 'numeric' })
    }
    if (view === 'week') {
      const a = weekDays[0].toLocaleDateString(loc, { day: 'numeric', month: 'short' })
      const b = weekDays[6].toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })
      return `${a} – ${b}`
    }
    return cursor.toLocaleDateString(loc, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [view, cursor, weekDays, loc])

  const insights = useMemo(() => {
    const today = startOfDay(new Date())
    const todayBookings = bookingsOnDay(bookings, today)
    const pickups = todayBookings.filter((b) => isPickupDay(b, today)).length
    const returns = todayBookings.filter((b) => isReturnDay(b, today)).length
    const onRent = todayBookings.filter((b) => {
      const s = String(b.status || '').toLowerCase()
      return s === 'active' || s === 'confirmed' || s === 'ready_for_pickup'
    }).length
    const busyCars = new Set(todayBookings.map(carKey)).size
    return {
      onRent,
      pickups,
      returns,
      busyCars,
      conflicts: conflictIds.size,
    }
  }, [bookings, conflictIds])

  const viewOptions = VIEW_IDS.map((v) => ({ id: v.id, label: t(v.labelKey) }))

  const openBooking = useCallback((booking) => {
    setTip(null)
    setSelected(booking)
  }, [])

  const showTip = useCallback((booking, event) => {
    if (tipTimer.current) window.clearTimeout(tipTimer.current)
    const rect = event.currentTarget.getBoundingClientRect()
    tipTimer.current = window.setTimeout(() => {
      const x = Math.min(rect.left, window.innerWidth - 280)
      const y = Math.min(rect.bottom + 8, window.innerHeight - 140)
      setTip({ booking, x: Math.max(8, x), y: Math.max(8, y) })
    }, 140)
  }, [])

  const hideTip = useCallback(() => {
    if (tipTimer.current) window.clearTimeout(tipTimer.current)
    setTip(null)
  }, [])

  const chipMark = (booking, date) => {
    if (conflictIds.has(String(booking._id))) return '!'
    if (isPickupDay(booking, date)) return '↑'
    if (isReturnDay(booking, date)) return '↓'
    return '•'
  }

  const renderChip = (booking, date) => {
    const conflict = conflictIds.has(String(booking._id))
    const tone = conflict ? 'conflict' : statusTone(booking.status)
    return (
      <button
        key={booking._id}
        type="button"
        className={`bc-chip bc-chip--${tone}`}
        title={vehicleLabel(booking)}
        onClick={(e) => {
          e.stopPropagation()
          openBooking(booking)
        }}
        onMouseEnter={(e) => showTip(booking, e)}
        onMouseLeave={hideTip}
        onFocus={(e) => showTip(booking, e)}
        onBlur={hideTip}
      >
        <span className="bc-chip__mark" aria-hidden>
          {chipMark(booking, date)}
        </span>
        <span className="bc-chip__label">{vehicleLabel(booking)}</span>
      </button>
    )
  }

  const openDayView = (date) => {
    const d = startOfDay(date)
    setSelectedDay(d)
    setCursor(d)
    setView('day')
  }

  const selectDay = (date) => {
    const d = startOfDay(date)
    setSelectedDay(d)
    if (window.matchMedia('(max-width: 719px)').matches) {
      setCursor(d)
    }
  }

  const weekVehicles = useMemo(() => {
    if (view !== 'week') return []
    return vehiclesInRange(bookings, weekDays[0], weekDays[6])
  }, [view, bookings, weekDays])

  const dayBookings = useMemo(() => bookingsOnDay(bookings, cursor), [bookings, cursor])
  const dayVehicles = useMemo(() => {
    const rangeStart = startOfDay(cursor)
    const rangeEnd = new Date(cursor)
    rangeEnd.setHours(23, 59, 59, 999)
    return vehiclesInRange(dayBookings, rangeStart, rangeEnd)
  }, [dayBookings, cursor])

  const selectedAgenda = useMemo(
    () => bookingsOnDay(bookings, selectedDay),
    [bookings, selectedDay],
  )

  const weekdayLabels = WEEKDAY_KEYS.map((k) => t(`admin.calendar.dow.${k}`))

  return (
    <AdminPage className="bc-page">
      <PageHeader
        title={t('admin.calendar.title')}
        description={t('admin.calendar.subtitle')}
        className="bc-header"
        actions={
          <Link to="/owner/manage-bookings" className="admin-btn admin-btn--secondary">
            {t('admin.calendar.openReservations')}
          </Link>
        }
      />

      <div className="bc-insights" aria-label={t('admin.calendar.insightsAria')}>
        <div className="bc-insight bc-insight--accent">
          <span className="bc-insight__label">{t('admin.calendar.statOnRent')}</span>
          <span className="bc-insight__value">{insights.onRent}</span>
        </div>
        <div className="bc-insight">
          <span className="bc-insight__label">{t('admin.calendar.statPickups')}</span>
          <span className="bc-insight__value">{insights.pickups}</span>
        </div>
        <div className="bc-insight">
          <span className="bc-insight__label">{t('admin.calendar.statReturns')}</span>
          <span className="bc-insight__value">{insights.returns}</span>
        </div>
        <div className="bc-insight">
          <span className="bc-insight__label">{t('admin.calendar.statVehicles')}</span>
          <span className="bc-insight__value">{insights.busyCars}</span>
        </div>
        <div className={`bc-insight${insights.conflicts ? ' bc-insight--warn' : ''}`}>
          <span className="bc-insight__label">{t('admin.calendar.statConflicts')}</span>
          <span className="bc-insight__value">{insights.conflicts}</span>
        </div>
      </div>

      <div className="bc-shell">
        <div className="bc-toolbar">
          <div className="bc-nav" role="group" aria-label={t('admin.calendar.navAria')}>
            <button type="button" className="bc-nav__btn bc-nav__btn--icon" onClick={() => shift(-1)} aria-label={t('admin.calendar.prev')}>
              ‹
            </button>
            <button type="button" className="bc-nav__btn bc-nav__btn--today" onClick={goToday}>
              {t('admin.calendar.today')}
            </button>
            <button type="button" className="bc-nav__btn bc-nav__btn--icon" onClick={() => shift(1)} aria-label={t('admin.calendar.next')}>
              ›
            </button>
          </div>

          <div className="bc-period">
            <h2 className="bc-period__title">{headerLabel}</h2>
            <p className="bc-period__hint">{t('admin.calendar.hintMarks')}</p>
          </div>

          <div className="bc-views">
            <SegmentedControl
              options={viewOptions}
              value={view}
              onChange={setView}
              ariaLabel={t('admin.calendar.viewAria')}
            />
          </div>
        </div>

        <div className="bc-legend" aria-hidden="true">
          <span className="bc-legend__item">
            <span className="bc-legend__swatch is-pending" /> {t('admin.calendar.legendPending')}
          </span>
          <span className="bc-legend__item">
            <span className="bc-legend__swatch is-confirmed" /> {t('admin.calendar.legendConfirmed')}
          </span>
          <span className="bc-legend__item">
            <span className="bc-legend__swatch is-ready" /> {t('admin.calendar.legendReady')}
          </span>
          <span className="bc-legend__item">
            <span className="bc-legend__swatch is-active" /> {t('admin.calendar.legendActive')}
          </span>
          <span className="bc-legend__item">
            <span className="bc-legend__swatch is-conflict" /> {t('admin.calendar.legendConflict')}
          </span>
          <span className="bc-legend__item">↑ {t('admin.calendar.legendPickup')}</span>
          <span className="bc-legend__item">↓ {t('admin.calendar.legendReturn')}</span>
        </div>

        <div className="bc-body">
          {loading ? (
            <Skeleton className="bc-skel w-full" />
          ) : view === 'month' ? (
            <>
              <div className="bc-month">
                <div className="bc-month__head">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="bc-month__dow">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="bc-month__grid">
                  {monthGrid.map((date) => {
                    const list = bookingsOnDay(bookings, date)
                    const level = densityLevel(list.length)
                    const inMonth = isSameMonth(date, cursor)
                    const isToday = sameDay(date, now)
                    const isSelected = sameDay(date, selectedDay)
                    const hasConflict = list.some((b) => conflictIds.has(String(b._id)))
                    const visible = list.slice(0, 3)
                    const overflow = list.length - visible.length

                    return (
                      <div
                        key={date.toISOString()}
                        role="button"
                        tabIndex={0}
                        className={[
                          'bc-day',
                          !inMonth && 'bc-day--muted',
                          isToday && 'bc-day--today',
                          isSelected && 'bc-day--selected',
                          level > 0 && `bc-day--busy-${level}`,
                          hasConflict && 'bc-day--has-conflict',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => selectDay(date)}
                        onDoubleClick={() => openDayView(date)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') openDayView(date)
                          if (e.key === ' ') {
                            e.preventDefault()
                            selectDay(date)
                          }
                        }}
                      >
                        <div className="bc-day__top">
                          <span className="bc-day__num">{date.getDate()}</span>
                          {list.length > 0 && (
                            <span className="bc-day__count">{list.length}</span>
                          )}
                        </div>
                        <div className="bc-day__events">
                          {visible.map((b) => renderChip(b, date))}
                        </div>
                        {overflow > 0 && (
                          <button
                            type="button"
                            className="bc-more"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDayDrawer({ date, bookings: list })
                            }}
                          >
                            {t('admin.calendar.more', { count: overflow })}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bc-mobile-agenda">
                <h3 className="bc-agenda__title">
                  {selectedDay.toLocaleDateString(loc, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                {selectedAgenda.length === 0 ? (
                  <EmptyState icon="calendar" title={t('admin.calendar.noDay')} />
                ) : (
                  <div className="bc-agenda">
                    {selectedAgenda.map((b) => (
                      <button
                        key={b._id}
                        type="button"
                        className="bc-agenda-card"
                        onClick={() => openBooking(b)}
                      >
                        <div className="bc-agenda-card__row">
                          <span className="bc-agenda-card__vehicle">{vehicleLabel(b)}</span>
                          <StatusBadge status={b.status} className="admin-badge--compact" />
                        </div>
                        <p className="bc-agenda-card__meta">{b.customerName || '—'}</p>
                        <p className="bc-agenda-card__times">
                          {formatShortTime(b.pickupDate, language)} → {formatShortTime(b.returnDate, language)}
                          {conflictIds.has(String(b._id)) ? ` · ${t('admin.calendar.conflict')}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : view === 'week' ? (
            <div className="bc-week">
              {weekVehicles.length === 0 ? (
                <div className="bc-week-empty">{t('admin.calendar.noWeek')}</div>
              ) : (
                <div className="bc-week__table" role="grid" aria-label={t('admin.calendar.weekGridAria')}>
                  <div className="bc-week__corner" />
                  {weekDays.map((date) => (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={`bc-week__colhead${sameDay(date, now) ? ' is-today' : ''}`}
                      onClick={() => openDayView(date)}
                    >
                      <span className="bc-week__dow">
                        {date.toLocaleDateString(loc, { weekday: 'short' })}
                      </span>
                      <span className="bc-week__dom">{date.getDate()}</span>
                    </button>
                  ))}
                  {weekVehicles.map((vehicle) => (
                    <React.Fragment key={vehicle.key}>
                      <div className="bc-week__vehicle">
                        <span className="bc-week__vehicle-name" title={vehicle.label}>
                          {vehicle.label}
                        </span>
                        <span className="bc-week__vehicle-sub">
                          {t('admin.calendar.rentalsCount', { count: vehicle.bookings.length })}
                        </span>
                      </div>
                      {weekDays.map((date) => {
                        const cellBookings = vehicle.bookings.filter((b) =>
                          bookingsOnDay([b], date).length,
                        )
                        const conflict = cellBookings.some((b) => conflictIds.has(String(b._id)))
                        return (
                          <div
                            key={`${vehicle.key}-${date.toISOString()}`}
                            className={[
                              'bc-week__cell',
                              sameDay(date, now) && 'is-today',
                              cellBookings.length === 0 && 'is-free',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {cellBookings.map((b) => {
                              const tone = conflictIds.has(String(b._id))
                                ? 'conflict'
                                : statusTone(b.status)
                              return (
                                <button
                                  key={b._id}
                                  type="button"
                                  className={`bc-week__bar bc-chip--${tone}`}
                                  onClick={() => openBooking(b)}
                                  onMouseEnter={(e) => showTip(b, e)}
                                  onMouseLeave={hideTip}
                                >
                                  <span className="bc-week__bar-name">
                                    {chipMark(b, date)} {b.customerName || b.reservationId}
                                  </span>
                                  <span className="bc-week__bar-meta">
                                    {formatShortTime(b.pickupDate, language)}
                                    {conflict ? ` · ${t('admin.calendar.conflict')}` : ''}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bc-dayview">
              <div className="bc-dayview__stats">
                <span className="bc-pill">
                  {t('admin.calendar.dayTotal')} <strong>{dayBookings.length}</strong>
                </span>
                <span className="bc-pill">
                  {t('admin.calendar.statPickups')}{' '}
                  <strong>{dayBookings.filter((b) => isPickupDay(b, cursor)).length}</strong>
                </span>
                <span className="bc-pill">
                  {t('admin.calendar.statReturns')}{' '}
                  <strong>{dayBookings.filter((b) => isReturnDay(b, cursor)).length}</strong>
                </span>
                {dayBookings.some((b) => conflictIds.has(String(b._id))) && (
                  <span className="bc-pill bc-pill--danger">{t('admin.calendar.hasConflicts')}</span>
                )}
              </div>

              {dayVehicles.length === 0 ? (
                <EmptyState icon="calendar" title={t('admin.calendar.noDay')} />
              ) : (
                dayVehicles.map((vehicle) => {
                  const hasConflict = vehicle.bookings.some((b) => conflictIds.has(String(b._id)))
                  return (
                    <section key={vehicle.key} className="bc-lane">
                      <header className="bc-lane__head">
                        <h3 className="bc-lane__title">{vehicle.label}</h3>
                        {hasConflict && (
                          <span className="bc-lane__badge">{t('admin.calendar.overlap')}</span>
                        )}
                      </header>
                      <div className="bc-lane__list">
                        {vehicle.bookings.map((b) => {
                          const conflict = conflictIds.has(String(b._id))
                          const tone = conflict ? 'conflict' : statusTone(b.status)
                          return (
                            <button
                              key={b._id}
                              type="button"
                              className={`bc-rental bc-rental--${tone}`}
                              onClick={() => openBooking(b)}
                            >
                              <span className="bc-rental__rail" aria-hidden />
                              <div className="bc-rental__main">
                                <p className="bc-rental__customer">{b.customerName || '—'}</p>
                                <p className="bc-rental__meta">
                                  {formatDayMonth(b.pickupDate, language)}{' '}
                                  {formatShortTime(b.pickupDate, language)}
                                  {' → '}
                                  {formatDayMonth(b.returnDate, language)}{' '}
                                  {formatShortTime(b.returnDate, language)}
                                </p>
                                <div className="bc-rental__flags">
                                  {isPickupDay(b, cursor) && (
                                    <span className="bc-flag bc-flag--in">{t('admin.calendar.startsToday')}</span>
                                  )}
                                  {isReturnDay(b, cursor) && (
                                    <span className="bc-flag bc-flag--out">{t('admin.calendar.endsToday')}</span>
                                  )}
                                  {!isPickupDay(b, cursor) && !isReturnDay(b, cursor) && (
                                    <span className="bc-flag">{t('admin.calendar.ongoing')}</span>
                                  )}
                                  {conflict && (
                                    <span className="bc-flag bc-flag--conflict">{t('admin.calendar.conflict')}</span>
                                  )}
                                </div>
                              </div>
                              <div className="bc-rental__side">
                                <StatusBadge status={b.status} className="admin-badge--compact" />
                                <span className="bc-rental__id">{b.reservationId || ''}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {tip?.booking && (
        <div className="bc-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <p className="bc-tip__vehicle">{vehicleLabel(tip.booking)}</p>
          <p className="bc-tip__line">{tip.booking.customerName || '—'}</p>
          <p className="bc-tip__line">
            {new Date(tip.booking.pickupDate).toLocaleString(loc)} →{' '}
            {new Date(tip.booking.returnDate).toLocaleString(loc)}
          </p>
          <div className="bc-tip__status">
            <StatusBadge status={tip.booking.status} className="admin-badge--compact" />
            {conflictIds.has(String(tip.booking._id)) && (
              <span className="bc-flag bc-flag--conflict" style={{ marginInlineStart: '0.35rem' }}>
                {t('admin.calendar.conflict')}
              </span>
            )}
          </div>
        </div>
      )}

      <AdminModal
        open={Boolean(dayDrawer)}
        onClose={() => setDayDrawer(null)}
        title={
          dayDrawer
            ? dayDrawer.date.toLocaleDateString(loc, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : ''
        }
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => {
                if (dayDrawer) openDayView(dayDrawer.date)
                setDayDrawer(null)
              }}
            >
              {t('admin.calendar.openDay')}
            </button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setDayDrawer(null)}>
              {t('admin.calendar.close')}
            </button>
          </>
        }
      >
        {dayDrawer && (
          <div className="bc-drawer-list">
            {dayDrawer.bookings.map((b) => (
              <button
                key={b._id}
                type="button"
                className="bc-agenda-card"
                onClick={() => {
                  setDayDrawer(null)
                  openBooking(b)
                }}
              >
                <div className="bc-agenda-card__row">
                  <span className="bc-agenda-card__vehicle">{vehicleLabel(b)}</span>
                  <StatusBadge status={b.status} className="admin-badge--compact" />
                </div>
                <p className="bc-agenda-card__meta">{b.customerName || '—'}</p>
                <p className="bc-agenda-card__times">
                  {formatShortTime(b.pickupDate, language)} → {formatShortTime(b.returnDate, language)}
                </p>
              </button>
            ))}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.reservationId || t('admin.bookings.reservation')}
        size="sm"
        footer={
          <>
            <Link
              to="/owner/manage-bookings"
              className="admin-btn admin-btn--secondary"
              onClick={() => setSelected(null)}
            >
              {t('admin.calendar.openReservations')}
            </Link>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setSelected(null)}>
              {t('admin.calendar.close')}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-2 text-sm text-[var(--admin-fg-secondary)]">
            <ChannelBadge channel={selected.channel || 'online'} />
            <p>
              <span className="font-medium text-[var(--admin-fg)]">{t('admin.bookings.customer')}:</span>{' '}
              {selected.customerName}
            </p>
            <p>
              <span className="font-medium text-[var(--admin-fg)]">{t('admin.bookings.vehicle')}:</span>{' '}
              {selected.car?.brand} {selected.car?.model}
            </p>
            <p>
              <span className="font-medium text-[var(--admin-fg)]">{t('admin.calendar.legendPickup')}:</span>{' '}
              {new Date(selected.pickupDate).toLocaleString(loc)}
            </p>
            <p>
              <span className="font-medium text-[var(--admin-fg)]">{t('admin.calendar.legendReturn')}:</span>{' '}
              {new Date(selected.returnDate).toLocaleString(loc)}
            </p>
            {conflictIds.has(String(selected._id)) && (
              <p className="text-[var(--admin-danger)] font-medium">{t('admin.calendar.conflictDetail')}</p>
            )}
            <StatusBadge status={selected.status} />
          </div>
        )}
      </AdminModal>
    </AdminPage>
  )
}

export default BookingCalendar
