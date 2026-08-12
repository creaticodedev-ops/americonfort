import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'

const field = 'w-full h-10 px-3 rounded-lg border border-borderColor text-sm'

const licenceHint = (item) => {
  if (!item.licenseExpiry) return null
  const d = new Date(item.licenseExpiry)
  if (Number.isNaN(d.getTime())) return null
  const days = Math.ceil((d - Date.now()) / 86400000)
  if (days < 0) return <span className="text-xs text-red-600">Expired</span>
  if (days <= 30) return <span className="text-xs text-amber-700">Expires soon</span>
  return null
}

const Chauffeurs = () => (
  <OwnerDirectoryPage
    title="Chauffeurs"
    subtitle="Agency drivers — separate from customer / second-driver data on reservations."
    endpoint="/api/owner/chauffeurs"
    emptyLabel="No chauffeurs yet."
    initialForm={{
      fullName: '',
      phone: '',
      email: '',
      address: '',
      licenseNumber: '',
      licenseExpiry: '',
      licenseCategory: '',
      notes: '',
      status: 'active',
    }}
    columns={[
      { key: 'fullName', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      {
        key: 'license',
        label: 'Licence',
        render: (i) => (
          <div>
            <div>{i.licenseNumber || '—'}</div>
            <div className="text-xs text-gray-500">
              {i.licenseExpiry ? new Date(i.licenseExpiry).toLocaleDateString() : ''}
            </div>
            {licenceHint(i)}
          </div>
        ),
      },
      { key: 'status', label: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    ]}
    buildForm={(form, setForm) => (
      <>
        <input className={field} placeholder="Full name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className={field} placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={field} placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={field} placeholder="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className={field} placeholder="Licence number" value={form.licenseNumber || ''} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={field} type="date" value={form.licenseExpiry ? String(form.licenseExpiry).slice(0, 10) : ''} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
          <input className={field} placeholder="Licence category" value={form.licenseCategory || ''} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} />
        </div>
        <textarea className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-borderColor text-sm" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </>
    )}
  />
)

export default Chauffeurs
