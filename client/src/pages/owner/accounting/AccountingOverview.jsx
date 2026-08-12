import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import Title from '../../../components/owner/Title'
import { useAppContext } from '../../../context/AppContext'
import { getErrorMessage } from '../../../utils/apiError'

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

const Kpi = ({ label, value, currency, emphasize, muted }) => (
  <div className={`rounded-2xl border p-4 sm:p-5 ${emphasize ? 'border-primary/40 bg-primary/5' : 'border-borderColor bg-white'}`}>
    <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
    <p className={`mt-2 text-2xl sm:text-3xl font-semibold tabular-nums ${muted ? 'text-gray-600' : 'text-gray-900'}`}>
      {currency}{Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </p>
  </div>
)

const AccountingOverview = () => {
  const { axios, currency } = useAppContext()
  const cur = `${String(currency || 'MAD').trim()} `
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (period === 'custom') {
        if (from) params.set('from', from)
        if (to) params.set('to', to)
      }
      const { data } = await axios.get(`/api/owner/accounting/overview?${params}`)
      if (data.success) setOverview(data.overview)
      else toast.error(data.message || 'Failed to load')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, period, from, to])

  useEffect(() => { load() }, [load])

  const k = overview?.kpis || {}
  const rangeLabel = overview?.from && overview?.to
    ? `${new Date(overview.from).toLocaleDateString()} – ${new Date(overview.to).toLocaleDateString()}`
    : ''

  return (
    <div className="px-4 pt-6 md:px-8 lg:px-10 xl:px-12 pb-16 flex-1 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <Title
          title="Accounting"
          subTitle="Rental financial overview for your agency. Revenue is calculated from bookings — never edited manually."
        />
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`h-9 px-3 rounded-lg text-xs font-medium border transition ${
                period === p.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-borderColor text-gray-700 hover:border-primary/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input type="date" className="h-10 px-3 rounded-lg border text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" className="h-10 px-3 rounded-lg border text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}

      {rangeLabel && (
        <p className="text-xs text-gray-500 mb-4">Period: {rangeLabel} · {overview?.breakdown?.revenue?.bookingCount || 0} revenue bookings</p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-borderColor bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
            <Kpi label="Gross Revenue" value={k.grossRevenue} currency={cur} />
            <Kpi label="Samsar Payments" value={k.samsarPayments} currency={cur} muted />
            <Kpi label="Agency Expenses" value={k.agencyExpenses} currency={cur} muted />
            <Kpi label="Vehicle Expenses" value={k.vehicleExpenses} currency={cur} muted />
            <Kpi label="Net Result" value={k.netResult} currency={cur} emphasize />
          </div>

          <div className="rounded-2xl border border-borderColor bg-white px-4 py-3 mb-8 text-sm text-gray-600">
            <span className="font-medium text-gray-800">Net Result</span>
            {' = '}
            Gross Revenue
            {' − '}
            Samsar Payments
            {' − '}
            Agency Expenses
            {' − '}
            Vehicle Expenses
            <span className="block mt-1 text-xs text-gray-400">
              Paid revenue {cur}{Number(k.paidRevenue || 0).toLocaleString()} · Unpaid {cur}{Number(k.unpaidRevenue || 0).toLocaleString()}
              {' · '}Cancelled bookings are excluded from gross revenue
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Revenues', 'Booking revenue ledger', '/owner/accounting/revenues'],
              ['Samsar Payments', 'Commission payouts', '/owner/accounting/samsar-payments'],
              ['Agency Expenses', 'Charges agences', '/owner/accounting/agency-expenses'],
              ['Vehicle Expenses', 'Charges voitures', '/owner/accounting/vehicle-expenses'],
            ].map(([label, hint, toPath]) => (
              <Link
                key={toPath}
                to={toPath}
                className="rounded-2xl border border-borderColor bg-white p-4 hover:border-primary/40 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{hint}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default AccountingOverview
