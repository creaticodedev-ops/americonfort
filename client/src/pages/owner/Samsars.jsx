import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'

const field = 'w-full h-10 px-3 rounded-lg border border-borderColor text-sm'

const Samsars = () => (
  <OwnerDirectoryPage
    title="Samsars"
    subtitle="Manage intermediaries and their default commission settings."
    endpoint="/api/owner/samsars"
    emptyLabel="No Samsars yet. Create one to track commissions."
    initialForm={{
      fullName: '',
      phone: '',
      email: '',
      address: '',
      commissionType: 'percent',
      commissionValue: 10,
      notes: '',
      status: 'active',
    }}
    columns={[
      { key: 'fullName', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      {
        key: 'commission',
        label: 'Commission',
        render: (i) =>
          i.commissionType === 'none'
            ? '—'
            : i.commissionType === 'percent'
              ? `${i.commissionValue}%`
              : `${i.commissionValue}`,
      },
      { key: 'status', label: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    ]}
    buildForm={(form, setForm) => (
      <>
        <input className={field} placeholder="Full name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className={field} placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={field} placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={field} placeholder="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className={field} value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })}>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed</option>
            <option value="none">None</option>
          </select>
          <input className={field} type="number" min="0" placeholder="Value" value={form.commissionValue ?? 0} onChange={(e) => setForm({ ...form, commissionValue: e.target.value })} />
        </div>
        <textarea className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-borderColor text-sm" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </>
    )}
  />
)

export default Samsars
