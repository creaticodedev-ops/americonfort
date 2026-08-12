import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'

const field = 'w-full h-10 px-3 rounded-lg border border-borderColor text-sm'

const PartnerCompanies = () => (
  <OwnerDirectoryPage
    title="Partner Companies"
    subtitle="Sociétés partenaires — ready for future links to reservations, vehicles, and finance."
    endpoint="/api/owner/partner-companies"
    nameField="companyName"
    emptyLabel="No partner companies yet."
    initialForm={{
      companyName: '',
      legalName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: 'Morocco',
      taxId: '',
      registrationNumber: '',
      notes: '',
      status: 'active',
    }}
    columns={[
      { key: 'companyName', label: 'Company' },
      { key: 'contactPerson', label: 'Contact' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    ]}
    buildForm={(form, setForm) => (
      <>
        <input className={field} placeholder="Company name *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        <input className={field} placeholder="Legal name" value={form.legalName || ''} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
        <input className={field} placeholder="Contact person" value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
        <input className={field} placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={field} placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={field} placeholder="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={field} placeholder="City" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className={field} placeholder="Country" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className={field} placeholder="Tax ID" value={form.taxId || ''} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          <input className={field} placeholder="Registration #" value={form.registrationNumber || ''} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
        </div>
        <textarea className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-borderColor text-sm" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </>
    )}
  />
)

export default PartnerCompanies
