import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../../components/owner/Title'
import { StatusBadge } from '../../../components/owner/OwnerDirectoryPage'
import { useAppContext } from '../../../context/AppContext'
import { getErrorMessage } from '../../../utils/apiError'

const field = 'h-10 px-3 rounded-lg border border-borderColor text-sm'

/** Shared accounting list shell */
const AccountingListPage = ({
  title,
  subtitle,
  listUrl,
  createUrl,
  columns,
  buildCreateForm,
  initialForm,
  dateFieldLabel = 'Date',
}) => {
  const { axios, currency } = useAppContext()
  const cur = (currency || 'MAD ').trim()
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ pages: 1 })
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', period: 'custom' })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const { data } = await axios.get(`${listUrl}?${params}`)
      if (data.success) {
        setItems(data.items || [])
        setPagination(data.pagination || { pages: 1 })
        setTotals(data.totals || null)
      } else toast.error(data.message || 'Failed')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, listUrl, page, from, to])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await axios.post(createUrl, form)
      if (!data.success) throw new Error(data.message)
      toast.success('Saved')
      setModal(false)
      setForm(initialForm)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pt-6 md:px-8 lg:px-10 xl:px-12 pb-16 flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <Title title={title} subTitle={subtitle} />
        {createUrl && (
          <button type="button" className="h-10 px-4 rounded-lg bg-primary text-white text-sm" onClick={() => setModal(true)}>
            Add
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input type="date" className={field} value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} title={dateFieldLabel} />
        <input type="date" className={field} value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} />
      </div>

      {totals && (
        <p className="text-sm text-gray-600 mb-3">
          Total: <strong>{cur}{Number(totals.grossRevenue ?? totals.total ?? 0).toLocaleString()}</strong>
          {totals.paidRevenue != null && <> · Paid: {cur}{Number(totals.paidRevenue).toLocaleString()}</>}
          {totals.unpaidRevenue != null && <> · Unpaid: {cur}{Number(totals.unpaidRevenue).toLocaleString()}</>}
        </p>
      )}

      <div className="rounded-xl border border-borderColor bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No records for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-borderColor">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3">{c.render ? c.render(item, cur) : (item[c.key] ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="mt-4 flex gap-2 items-center">
          <button type="button" className="px-3 py-1 border rounded text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="text-xs text-gray-500">{page}/{pagination.pages}</span>
          <button type="button" className="px-3 py-1 border rounded text-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {modal && buildCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Add record</h2>
            <div className="space-y-3">{buildCreateForm(form, setForm)}</div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="px-4 h-10 border rounded-lg text-sm" onClick={() => setModal(false)}>Cancel</button>
              <button type="button" disabled={saving} className="px-4 h-10 bg-primary text-white rounded-lg text-sm" onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const RevenuesPage = () => (
  <AccountingListPage
    title="Revenues"
    subtitle="Derived from bookings (no separate revenue ledger)."
    listUrl="/api/owner/accounting/revenues"
    createUrl={null}
    initialForm={{}}
    columns={[
      { key: 'reservationId', label: 'Reservation', render: (i) => i.reservationId || '—' },
      { key: 'customerName', label: 'Customer' },
      { key: 'car', label: 'Vehicle', render: (i) => (i.car ? `${i.car.brand} ${i.car.model}` : '—') },
      { key: 'price', label: 'Amount', render: (i, cur) => `${cur}${i.price}` },
      { key: 'paymentStatus', label: 'Payment', render: (i) => <StatusBadge status={i.paymentStatus} /> },
      { key: 'createdAt', label: 'Date', render: (i) => new Date(i.createdAt).toLocaleDateString() },
    ]}
  />
)

const input = 'w-full h-10 px-3 rounded-lg border border-borderColor text-sm'

export const SamsarPaymentsPage = () => {
  const { axios } = useAppContext()
  const [samsars, setSamsars] = useState([])
  useEffect(() => {
    axios.get('/api/owner/samsars?limit=100&status=active').then(({ data }) => {
      if (data.success) setSamsars(data.items || [])
    }).catch(() => {})
  }, [axios])

  return (
    <AccountingListPage
      title="Samsar Payments"
      subtitle="Commission payments to Samsars (separate from customer payments)."
      listUrl="/api/owner/accounting/samsar-payments"
      createUrl="/api/owner/accounting/samsar-payments"
      initialForm={{ samsarId: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentStatus: 'paid', paymentMethod: 'cash', notes: '', bookingId: '' }}
      columns={[
        { key: 'samsar', label: 'Samsar', render: (i) => i.samsar?.fullName || '—' },
        { key: 'amount', label: 'Amount', render: (i, cur) => `${cur}${i.amount}` },
        { key: 'paymentDate', label: 'Date', render: (i) => new Date(i.paymentDate).toLocaleDateString() },
        { key: 'paymentStatus', label: 'Status', render: (i) => <StatusBadge status={i.paymentStatus} /> },
        { key: 'booking', label: 'Reservation', render: (i) => i.booking?.reservationId || '—' },
      ]}
      buildCreateForm={(form, setForm) => (
        <>
          <select className={input} value={form.samsarId} onChange={(e) => setForm({ ...form, samsarId: e.target.value })}>
            <option value="">Select Samsar *</option>
            {samsars.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}
          </select>
          <input className={input} type="number" min="0" step="0.01" placeholder="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={input} type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          <select className={input} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className={input} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="check">Check</option>
            <option value="other">Other</option>
          </select>
          <input className={input} placeholder="Booking ID (optional)" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} />
          <textarea className="w-full min-h-[70px] px-3 py-2 rounded-lg border text-sm" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </>
      )}
    />
  )
}

export const AgencyExpensesPage = () => (
  <AccountingListPage
    title="Agency Expenses"
    subtitle="Charges agences — operating costs for the agency."
    listUrl="/api/owner/accounting/agency-expenses"
    createUrl="/api/owner/accounting/agency-expenses"
    initialForm={{ category: 'other', amount: '', expenseDate: new Date().toISOString().slice(0, 10), description: '', paymentStatus: 'paid', paymentMethod: 'cash', notes: '' }}
    columns={[
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', render: (i, cur) => `${cur}${i.amount}` },
      { key: 'expenseDate', label: 'Date', render: (i) => new Date(i.expenseDate).toLocaleDateString() },
      { key: 'paymentStatus', label: 'Status', render: (i) => <StatusBadge status={i.paymentStatus} /> },
    ]}
    buildCreateForm={(form, setForm) => (
      <>
        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {['rent', 'utilities', 'salaries', 'marketing', 'insurance', 'taxes', 'supplies', 'software', 'other'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input className={input} type="number" min="0" step="0.01" placeholder="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input className={input} type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
        <input className={input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select className={input} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <textarea className="w-full min-h-[70px] px-3 py-2 rounded-lg border text-sm" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </>
    )}
  />
)

export const VehicleExpensesPage = () => {
  const { axios } = useAppContext()
  const [cars, setCars] = useState([])
  useEffect(() => {
    axios.get('/api/owner/cars').then(({ data }) => {
      const list = data.cars || data.items || []
      setCars(list)
    }).catch(() => {})
  }, [axios])

  return (
    <AccountingListPage
      title="Vehicle Expenses"
      subtitle="Charges voitures — fuel, repairs, insurance, and more."
      listUrl="/api/owner/accounting/vehicle-expenses"
      createUrl="/api/owner/accounting/vehicle-expenses"
      initialForm={{ carId: '', category: 'fuel', amount: '', expenseDate: new Date().toISOString().slice(0, 10), description: '', paymentStatus: 'paid', paymentMethod: 'cash', odometer: '', notes: '' }}
      columns={[
        { key: 'car', label: 'Vehicle', render: (i) => (i.car ? `${i.car.brand} ${i.car.model}` : '—') },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', render: (i, cur) => `${cur}${i.amount}` },
        { key: 'odometer', label: 'Odometer', render: (i) => (i.odometer != null ? `${i.odometer} km` : '—') },
        { key: 'expenseDate', label: 'Date', render: (i) => new Date(i.expenseDate).toLocaleDateString() },
        { key: 'paymentStatus', label: 'Status', render: (i) => <StatusBadge status={i.paymentStatus} /> },
      ]}
      buildCreateForm={(form, setForm) => (
        <>
          <select className={input} value={form.carId} onChange={(e) => setForm({ ...form, carId: e.target.value })}>
            <option value="">Select vehicle *</option>
            {cars.map((c) => (
              <option key={c._id} value={c._id}>{c.brand} {c.model} {c.licensePlate || ''}</option>
            ))}
          </select>
          <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['fuel', 'maintenance', 'repair', 'insurance', 'registration', 'tires', 'cleaning', 'parking', 'tolls', 'other'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input className={input} type="number" min="0" step="0.01" placeholder="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={input} type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          <input className={input} type="number" min="0" placeholder="Odometer (optional)" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
          <input className={input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className={input} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <textarea className="w-full min-h-[70px] px-3 py-2 rounded-lg border text-sm" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </>
      )}
    />
  )
}

export default AccountingListPage
