import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPage, PageHeader, StatCard, SegmentedControl, AdminModal, AdminForm, AdminFormSection, AdminFormField, AdminFormInput, AdminFormTextarea, AdminFormSelect, AdminFormGrid, AdminFormCheckbox } from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { downloadXlsxFromApi } from '../../utils/downloadXlsx'

const toInputDate = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d)) return ''
  return d.toISOString().split('T')[0]
}

const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700',
  booked: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-800',
}

const TYPE_KEYS = {
  oil_change: 'typeOil',
  tire_replacement: 'typeTire',
  general_service: 'typeService',
  repair: 'typeRepair',
  inspection: 'typeInspection',
  insurance: 'typeInsurance',
  registration: 'typeRegistration',
  other: 'typeOther',
}

const emptyRecord = {
  carId: '',
  type: 'general_service',
  title: '',
  description: '',
  status: 'scheduled',
  scheduledDate: '',
  completedDate: '',
  mileageAtService: '',
  cost: '',
  vendor: '',
  invoiceRef: '',
  nextDueDate: '',
  nextDueMileage: '',
  notes: '',
  setCarInMaintenance: true,
}

const formatUnit = (car) => {
  if (!car) return '—'
  const fleet = car.fleetId ? `[${car.fleetId}] ` : ''
  const plate = car.licensePlate ? ` · ${car.licensePlate}` : ''
  const branch = car.branch ? ` · ${car.branch}` : ''
  return `${fleet}${car.brand || ''} ${car.model || ''}${plate}${branch}`.trim()
}

const Maintenance = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [tab, setTab] = useState('fleet')
  const [cars, setCars] = useState([])
  const [branches, setBranches] = useState([])
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [records, setRecords] = useState([])
  const [events, setEvents] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))
  const [showRecord, setShowRecord] = useState(false)
  const [recordForm, setRecordForm] = useState(emptyRecord)
  const patchRecordForm = (patch) => setRecordForm((prev) => ({ ...prev, ...patch }))
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    fleetId: '',
    vin: '',
    plate: '',
    status: '',
    branch: '',
  })
  const [applied, setApplied] = useState(filters)

  const loadFleet = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      Object.entries(applied).forEach(([k, v]) => {
        if (v) params[k] = v
      })
      const { data } = await axios.get('/api/owner/maintenance', { params })
      if (data.success) {
        setCars(data.cars)
        setAlerts(data.alerts)
        setSummary(data.summary)
        setUpcoming(data.upcoming || [])
        setBranches(data.branches || [])
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [axios, applied])

  const loadRecords = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/owner/maintenance/records', { params: { limit: 50 } })
      if (data.success) setRecords(data.records)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [axios])

  const loadCalendar = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/owner/maintenance/calendar', {
        params: { month: calMonth, year: calYear },
      })
      if (data.success) setEvents(data.events || [])
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [axios, calMonth, calYear])

  const loadReport = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/owner/maintenance/report')
      if (data.success) setReport(data.report)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [axios])

  useEffect(() => { loadFleet() }, [loadFleet])
  useEffect(() => {
    if (tab === 'history') loadRecords()
    if (tab === 'calendar') loadCalendar()
    if (tab === 'reports') loadReport()
  }, [tab, loadRecords, loadCalendar, loadReport])

  const startEdit = (car) => {
    setEditing(car)
    setForm({
      mileage: car.mileage || '',
      nextServiceMileage: car.nextServiceMileage || '',
      nextServiceDate: toInputDate(car.nextServiceDate),
      lastServiceDate: toInputDate(car.lastServiceDate),
      insuranceExpiry: toInputDate(car.insuranceExpiry),
      registrationExpiry: toInputDate(car.registrationExpiry),
      inspectionExpiry: toInputDate(car.inspectionExpiry),
      oilLastChangedAt: toInputDate(car.oilLastChangedAt),
      oilNextDueAt: toInputDate(car.oilNextDueAt),
      oilNextDueMileage: car.oilNextDueMileage || '',
      tireLastChangedAt: toInputDate(car.tireLastChangedAt),
      tireNextDueAt: toInputDate(car.tireNextDueAt),
      tireNextDueMileage: car.tireNextDueMileage || '',
      maintenanceNotes: car.maintenanceNotes || '',
      licensePlate: car.licensePlate || '',
      status: car.status || 'available',
    })
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post('/api/owner/maintenance/update', {
        carId: editing._id,
        ...form,
        nextServiceDate: form.nextServiceDate || null,
        lastServiceDate: form.lastServiceDate || null,
        insuranceExpiry: form.insuranceExpiry || null,
        registrationExpiry: form.registrationExpiry || null,
        inspectionExpiry: form.inspectionExpiry || null,
        oilLastChangedAt: form.oilLastChangedAt || null,
        oilNextDueAt: form.oilNextDueAt || null,
        tireLastChangedAt: form.tireLastChangedAt || null,
        tireNextDueAt: form.tireNextDueAt || null,
      })
      if (data.success) {
        toast.success(data.message)
        setEditing(null)
        loadFleet()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const saveRecord = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post('/api/owner/maintenance/records', {
        ...recordForm,
        mileageAtService: recordForm.mileageAtService || null,
        cost: recordForm.cost || 0,
        nextDueMileage: recordForm.nextDueMileage || null,
        scheduledDate: recordForm.scheduledDate || null,
        completedDate: recordForm.completedDate || null,
        nextDueDate: recordForm.nextDueDate || null,
      })
      if (data.success) {
        toast.success(data.message)
        setShowRecord(false)
        setRecordForm(emptyRecord)
        loadFleet()
        if (tab === 'history') loadRecords()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const completeRecord = async (recordId) => {
    try {
      const { data } = await axios.patch('/api/owner/maintenance/records', {
        recordId,
        status: 'completed',
        completedDate: new Date().toISOString(),
      })
      if (data.success) {
        toast.success(t('admin.leftover.markedComplete'))
        loadRecords()
        loadFleet()
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const daysInMonth = useMemo(() => new Date(calYear, calMonth, 0).getDate(), [calYear, calMonth])
  const eventsByDay = useMemo(() => {
    const map = {}
    for (const ev of events) {
      const d = new Date(ev.scheduledDate || ev.completedDate || ev.nextDueDate)
      if (isNaN(d)) continue
      if (d.getMonth() + 1 !== calMonth || d.getFullYear() !== calYear) continue
      const day = d.getDate()
      map[day] = map[day] || []
      map[day].push(ev)
    }
    return map
  }, [events, calMonth, calYear])

  const inputClass = 'border border-borderColor rounded-md px-3 py-2 text-sm w-full outline-none focus:border-primary'
  const tabs = [
    { id: 'fleet', label: t('admin.maintenance.tabFleet') },
    { id: 'schedule', label: t('admin.maintenance.tabSchedule') },
    { id: 'history', label: t('admin.maintenance.tabHistory') },
    { id: 'calendar', label: t('admin.maintenance.tabCalendar') },
    { id: 'reports', label: t('admin.maintenance.tabReports') },
  ]

  const exportExcel = async () => {
    setExporting(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.type) params.type = filters.type
      if (filters.carId) params.carId = filters.carId
      await downloadXlsxFromApi(axios, '/api/owner/maintenance/export', {
        params,
        fallbackName: 'maintenance.xlsx',
      })
      toast.success(t('admin.exportUi.success'))
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.exportUi.failed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.maintenance.title')}
        description={t('admin.maintenance.subtitle')}
        actions={
          <>
            <button type="button" disabled={exporting} onClick={exportExcel} className="admin-btn admin-btn--secondary">
              {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
            </button>
            <button
              type="button"
              onClick={() => { setRecordForm(emptyRecord); setShowRecord(true) }}
              className="admin-btn admin-btn--primary"
            >
              {t('admin.maintenance.scheduleWork')}
            </button>
          </>
        }
      />

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label={t('admin.maintenance.totalFleet')} value={summary.total} />
          <StatCard label={t('admin.maintenance.available')} value={summary.available} tone="success" />
          <StatCard label={t('admin.maintenance.rented')} value={summary.rented} tone="info" />
          <StatCard label={t('admin.maintenance.inShop')} value={summary.maintenance} tone="warning" />
          <StatCard label={t('admin.maintenance.critical')} value={summary.criticalAlerts} tone="danger" />
          <StatCard label={t('admin.maintenance.costs')} value={`${currency}${summary.totalMaintenanceCost || 0}`} />
        </div>
      )}

      <div className="mb-4">
        <SegmentedControl
          options={tabs.map((tb) => ({ id: tb.id, label: tb.label }))}
          value={tab}
          onChange={setTab}
          ariaLabel={t('admin.maintenance.tabsAria')}
        />
      </div>

      {tab === 'fleet' && (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); setApplied({ ...filters }) }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-borderColor bg-white p-4"
          >
            <input
              className={inputClass}
              placeholder={t('admin.fleet.searchAll')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder={t('admin.fleet.fleetId')}
              value={filters.fleetId}
              onChange={(e) => setFilters({ ...filters, fleetId: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder={t('admin.fleet.vin')}
              value={filters.vin}
              onChange={(e) => setFilters({ ...filters, vin: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder={t('admin.fleet.plate')}
              value={filters.plate}
              onChange={(e) => setFilters({ ...filters, plate: e.target.value })}
            />
            <select
              className={inputClass}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">{t('admin.fleet.allStatuses')}</option>
              <option value="available">{t('admin.fleet.available')}</option>
              <option value="booked">{t('admin.maintenance.rented')}</option>
              <option value="maintenance">{t('admin.maintenance.inShop')}</option>
            </select>
            <select
              className={inputClass}
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
            >
              <option value="">{t('admin.fleet.allBranches')}</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dull">
                {t('admin.fleet.apply')}
              </button>
              <button
                type="button"
                className="px-4 py-2 border border-borderColor text-sm rounded-lg"
                onClick={() => {
                  const empty = { search: '', fleetId: '', vin: '', plate: '', status: '', branch: '' }
                  setFilters(empty)
                  setApplied(empty)
                }}
              >
                {t('admin.fleet.clear')}
              </button>
            </div>
          </form>

          {alerts.length > 0 && (
            <div className="mt-6 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">{t('admin.maintenance.activeAlerts')}</h2>
              {alerts.slice(0, 12).map((a, i) => (
                <div
                  key={`${a.carId}-${a.type}-${i}`}
                  className={`rounded-lg border px-4 py-3 text-sm ${a.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
                >
                  <span className="font-medium">{a.vehicle}</span> — {a.message}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-borderColor bg-white overflow-hidden">
            {loading ? (
              <p className="p-6 text-gray-400 text-sm">{t('admin.maintenance.loading')}</p>
            ) : cars.length === 0 ? (
              <p className="p-6 text-gray-400 text-sm">{t('admin.fleet.none')}</p>
            ) : (
              <div className="overflow-x-auto table-scroll">
                <table className="w-full text-sm text-start min-w-[1100px]">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">{t('admin.fleet.fleetId')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.vehicle')}</th>
                      <th className="px-4 py-3">{t('admin.fleet.plate')}</th>
                      <th className="px-4 py-3">{t('admin.fleet.vin')}</th>
                      <th className="px-4 py-3">{t('admin.fleet.branch')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.mileage')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.nextService')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.oil')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.tires')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.insurance')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.inspection')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.status')}</th>
                      <th className="px-4 py-3">{t('admin.maintenance.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map((car) => (
                      <tr key={car._id} className="border-t border-borderColor hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{car.fleetId || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{car.brand} {car.model}</p>
                          <p className="text-xs text-gray-400">{car.year} · {car.category}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{car.licensePlate || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{car.vin || '—'}</td>
                        <td className="px-4 py-3 text-xs">{car.branch || car.location || '—'}</td>
                        <td className="px-4 py-3">{car.mileage || 0} km</td>
                        <td className="px-4 py-3 text-xs">
                          {car.nextServiceDate ? new Date(car.nextServiceDate).toLocaleDateString() : '—'}
                          {car.nextServiceMileage ? <span className="block text-gray-400">@{car.nextServiceMileage} km</span> : null}
                        </td>
                        <td className="px-4 py-3 text-xs">{car.oilNextDueAt ? new Date(car.oilNextDueAt).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-xs">{car.tireNextDueAt ? new Date(car.tireNextDueAt).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-xs">{car.insuranceExpiry ? new Date(car.insuranceExpiry).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-xs">{car.inspectionExpiry ? new Date(car.inspectionExpiry).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[car.displayStatus] || STATUS_STYLES.available}`}>
                            {car.displayStatusLabel || car.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => startEdit(car)} className="text-primary text-xs hover:underline">
                            {t('admin.maintenance.update')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'schedule' && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{t('admin.maintenance.upcoming30')}</h2>
          {upcoming.length === 0 && <p className="text-sm text-gray-400">{t('admin.maintenance.noUpcoming')}</p>}
          {upcoming.map((r) => (
            <div key={r._id} className="rounded-xl border border-borderColor bg-white p-4 flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium text-gray-800">{r.title}</p>
                <p className="text-xs text-gray-500">
                  {formatUnit(r.car)} · {t(`admin.maint.${TYPE_KEYS[r.type] || 'typeOther'}`)} · {t(`admin.status.${r.status}`) !== `admin.status.${r.status}` ? t(`admin.status.${r.status}`) : r.status}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="mt-6 rounded-xl border border-borderColor bg-white overflow-hidden">
          <div className="overflow-x-auto table-scroll">
            <table className="w-full text-sm text-start min-w-[800px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t('admin.maint.date')}</th>
                  <th className="px-4 py-3">{t('admin.maint.vehicle')}</th>
                  <th className="px-4 py-3">{t('admin.maint.type')}</th>
                  <th className="px-4 py-3">{t('admin.maint.title')}</th>
                  <th className="px-4 py-3">{t('admin.maint.costTh')}</th>
                  <th className="px-4 py-3">{t('admin.maint.status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id} className="border-t border-borderColor">
                    <td className="px-4 py-3 text-xs">
                      {r.completedDate
                        ? new Date(r.completedDate).toLocaleDateString()
                        : r.scheduledDate
                          ? new Date(r.scheduledDate).toLocaleDateString()
                          : '—'}
                    </td>
                    <td className="px-4 py-3">{formatUnit(r.car)}</td>
                    <td className="px-4 py-3 text-xs">{t(`admin.maint.${TYPE_KEYS[r.type] || 'typeOther'}`)}</td>
                    <td className="px-4 py-3">{r.title}</td>
                    <td className="px-4 py-3">{currency}{r.cost || 0}</td>
                    <td className="px-4 py-3 capitalize text-xs">{r.status}</td>
                    <td className="px-4 py-3">
                      {r.status !== 'completed' && r.status !== 'cancelled' && (
                        <button type="button" onClick={() => completeRecord(r._id)} className="text-xs text-primary hover:underline">
                          {t('admin.bookings.complete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!records.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('admin.leftover.noHistory')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" className="px-3 py-1.5 border rounded-lg text-sm" onClick={() => {
              if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1) }
              else setCalMonth((m) => m - 1)
            }}>{t('admin.maint.prev')}</button>
            <p className="text-sm font-medium text-gray-800 min-w-[8rem] text-center">
              {new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
            <button type="button" className="px-3 py-1.5 border rounded-lg text-sm" onClick={() => {
              if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1) }
              else setCalMonth((m) => m + 1)
            }}>{t('admin.maint.next')}</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-gray-400 py-1 font-medium">{d}</div>
            ))}
            {Array.from({ length: new Date(calYear, calMonth - 1, 1).getDay() }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = eventsByDay[day] || []
              return (
                <div key={day} className="min-h-[4.5rem] border border-borderColor rounded-md p-1 bg-white">
                  <p className="text-[10px] text-gray-400">{day}</p>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <p key={ev._id} className="text-[9px] leading-tight truncate text-amber-800 bg-amber-50 rounded px-0.5 mt-0.5">
                      {ev.title}
                    </p>
                  ))}
                  {dayEvents.length > 3 && <p className="text-[9px] text-gray-400">+{dayEvents.length - 3}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'reports' && report && (
        <div className="mt-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400 uppercase">{t('admin.leftover.totalCostYtd')}</p>
              <p className="text-2xl font-semibold text-primary mt-1">{currency}{report.totalCost}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400 uppercase">{t('admin.maint.jobsCompleted')}</p>
              <p className="text-2xl font-semibold mt-1">{report.recordCount}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400 uppercase">{t('admin.maint.byType')}</p>
              <ul className="mt-2 text-xs space-y-1 max-h-24 overflow-y-auto">
                {Object.entries(report.byType || {}).map(([type, v]) => (
                  <li key={type} className="flex justify-between gap-2">
                    <span>{t(`admin.maint.${TYPE_KEYS[type] || 'typeOther'}`)}</span>
                    <span>{v.count} · {currency}{v.cost}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-start">{t('admin.maint.vehicle')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.maint.jobs')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.maint.costTh')}</th>
                </tr>
              </thead>
              <tbody>
                {(report.byVehicle || []).map((v) => (
                  <tr key={v.vehicle} className="border-t">
                    <td className="px-4 py-3">{v.vehicle}</td>
                    <td className="px-4 py-3">{v.count}</td>
                    <td className="px-4 py-3">{currency}{v.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit vehicle profile modal */}
      <AdminModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.fleetId ? `[${editing.fleetId}] ` : ''}${editing.brand} ${editing.model}${editing.licensePlate ? ` · ${editing.licensePlate}` : ''}` : ''}
        description={editing ? `${editing.vin ? `VIN ${editing.vin}` : 'No VIN'} · ${editing.branch || editing.location || 'No branch'}` : ''}
        size="lg"
        variant="drawer"
        footer={
          <>
            <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={() => setEditing(null)}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" form="maintenance-profile-form" className="admin-btn admin-btn--primary admin-modal-action">
              {t('admin.common.save')}
            </button>
          </>
        }
      >
        {editing && (
          <AdminForm id="maintenance-profile-form" onSubmit={saveProfile}>
            <AdminFormSection>
              <AdminFormGrid columns={2}>
                <AdminFormField label="Plate">
                  <AdminFormInput value={form.licensePlate ?? ''} onChange={(e) => patchForm({ licensePlate: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Mileage (km)">
                  <AdminFormInput type="number" inputMode="numeric" value={form.mileage ?? ''} onChange={(e) => patchForm({ mileage: e.target.value })} />
                </AdminFormField>
                <AdminFormField label={t('admin.maint.status')}>
                  <AdminFormSelect value={form.status} onChange={(e) => patchForm({ status: e.target.value })}>
                    <option value="available">{t('admin.status.available')}</option>
                    <option value="booked">{t('admin.status.booked')}</option>
                    <option value="maintenance">{t('admin.fleetUi.inMaintenance')}</option>
                  </AdminFormSelect>
                </AdminFormField>
                <AdminFormField label="Next service km">
                  <AdminFormInput type="number" inputMode="numeric" value={form.nextServiceMileage ?? ''} onChange={(e) => patchForm({ nextServiceMileage: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Next service date">
                  <AdminFormInput type="date" value={form.nextServiceDate ?? ''} onChange={(e) => patchForm({ nextServiceDate: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Last service">
                  <AdminFormInput type="date" value={form.lastServiceDate ?? ''} onChange={(e) => patchForm({ lastServiceDate: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Oil due date">
                  <AdminFormInput type="date" value={form.oilNextDueAt ?? ''} onChange={(e) => patchForm({ oilNextDueAt: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Oil due km">
                  <AdminFormInput type="number" inputMode="numeric" value={form.oilNextDueMileage ?? ''} onChange={(e) => patchForm({ oilNextDueMileage: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Tires due date">
                  <AdminFormInput type="date" value={form.tireNextDueAt ?? ''} onChange={(e) => patchForm({ tireNextDueAt: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Tires due km">
                  <AdminFormInput type="number" inputMode="numeric" value={form.tireNextDueMileage ?? ''} onChange={(e) => patchForm({ tireNextDueMileage: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Insurance expiry">
                  <AdminFormInput type="date" value={form.insuranceExpiry ?? ''} onChange={(e) => patchForm({ insuranceExpiry: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Registration expiry">
                  <AdminFormInput type="date" value={form.registrationExpiry ?? ''} onChange={(e) => patchForm({ registrationExpiry: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Inspection expiry">
                  <AdminFormInput type="date" value={form.inspectionExpiry ?? ''} onChange={(e) => patchForm({ inspectionExpiry: e.target.value })} />
                </AdminFormField>
              </AdminFormGrid>
              <AdminFormField label={t('admin.maint.notes')}>
                <AdminFormTextarea rows={2} value={form.maintenanceNotes} onChange={(e) => patchForm({ maintenanceNotes: e.target.value })} />
              </AdminFormField>
            </AdminFormSection>
          </AdminForm>
        )}
      </AdminModal>

      {/* Schedule / log work modal */}
      <AdminModal
        open={showRecord}
        onClose={() => setShowRecord(false)}
        title={t('admin.maintenance.scheduleWork')}
        variant="drawer"
        footer={
          <>
            <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={() => setShowRecord(false)}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" form="maintenance-record-form" className="admin-btn admin-btn--primary admin-modal-action">
              {t('admin.common.save')}
            </button>
          </>
        }
      >
        <AdminForm id="maintenance-record-form" onSubmit={saveRecord}>
          <AdminFormField label={t('admin.maint.vehicleRequired')} required>
            <AdminFormSelect required value={recordForm.carId} onChange={(e) => patchRecordForm({ carId: e.target.value })}>
              <option value="">{t('admin.maint.select')}</option>
              {cars.map((c) => (
                <option key={c._id} value={c._id}>{formatUnit(c)}</option>
              ))}
            </AdminFormSelect>
          </AdminFormField>
          <AdminFormGrid columns={2}>
            <AdminFormField label={t('admin.maint.type')}>
              <AdminFormSelect value={recordForm.type} onChange={(e) => patchRecordForm({ type: e.target.value })}>
                {Object.keys(TYPE_KEYS).map((k) => <option key={k} value={k}>{t(`admin.maint.${TYPE_KEYS[k]}`)}</option>)}
              </AdminFormSelect>
            </AdminFormField>
            <AdminFormField label={t('admin.maint.status')}>
              <AdminFormSelect value={recordForm.status} onChange={(e) => patchRecordForm({ status: e.target.value })}>
                <option value="scheduled">{t('admin.status.scheduled')}</option>
                <option value="in_progress">{t('admin.status.in_progress')}</option>
                <option value="completed">{t('admin.status.completed')}</option>
              </AdminFormSelect>
            </AdminFormField>
          </AdminFormGrid>
          <AdminFormField label={t('admin.maint.title')} required>
            <AdminFormInput required value={recordForm.title} onChange={(e) => patchRecordForm({ title: e.target.value })} placeholder={t('admin.maint.titlePh')} />
          </AdminFormField>
          <AdminFormGrid columns={2}>
            <AdminFormField label={t('admin.maint.scheduled')}>
              <AdminFormInput type="date" value={recordForm.scheduledDate} onChange={(e) => patchRecordForm({ scheduledDate: e.target.value })} />
            </AdminFormField>
            <AdminFormField label={t('admin.maint.cost')}>
              <AdminFormInput type="number" min="0" step="0.01" inputMode="decimal" value={recordForm.cost} onChange={(e) => patchRecordForm({ cost: e.target.value })} />
            </AdminFormField>
            <AdminFormField label={t('admin.maint.mileage')}>
              <AdminFormInput type="number" inputMode="numeric" value={recordForm.mileageAtService} onChange={(e) => patchRecordForm({ mileageAtService: e.target.value })} />
            </AdminFormField>
            <AdminFormField label={t('admin.maint.vendor')}>
              <AdminFormInput value={recordForm.vendor} onChange={(e) => patchRecordForm({ vendor: e.target.value })} />
            </AdminFormField>
            <AdminFormField label={t('admin.maint.nextDueDate')}>
              <AdminFormInput type="date" value={recordForm.nextDueDate} onChange={(e) => patchRecordForm({ nextDueDate: e.target.value })} />
            </AdminFormField>
            <AdminFormField label={t('admin.maint.nextDueKm')}>
              <AdminFormInput type="number" inputMode="numeric" value={recordForm.nextDueMileage} onChange={(e) => patchRecordForm({ nextDueMileage: e.target.value })} />
            </AdminFormField>
          </AdminFormGrid>
          <AdminFormCheckbox
            label={t('admin.maint.markInMaintenance')}
            checked={recordForm.setCarInMaintenance}
            onChange={(e) => patchRecordForm({ setCarInMaintenance: e.target.checked })}
          />
        </AdminForm>
      </AdminModal>
    </AdminPage>
  )
}

export default Maintenance
