import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SettingsLayout from './settings/SettingsLayout'
import SettingsHub from './settings/SettingsHub'
import BookingSettings from './settings/BookingSettings'
import WhatsAppSettings from './settings/WhatsAppSettings'
import DocumentsSettings from './settings/DocumentsSettings'
import InvoicesSettings from './settings/InvoicesSettings'
import GuideSettings from './settings/GuideSettings'
import GeneralSettings from './settings/GeneralSettings'
import BrandingSettings from './settings/BrandingSettings'
import DomainSettings from './settings/DomainSettings'

/**
 * Settings entry — hub + nested category pages.
 * Existing APIs and owner isolation are unchanged; this is navigation/UX only.
 */
const Settings = () => (
  <Routes>
    <Route element={<SettingsLayout />}>
      <Route index element={<SettingsHub />} />
      <Route path="general" element={<GeneralSettings />} />
      <Route path="booking" element={<BookingSettings />} />
      <Route path="whatsapp" element={<WhatsAppSettings />} />
      <Route path="documents" element={<DocumentsSettings />} />
      <Route path="invoices" element={<InvoicesSettings />} />
      <Route path="branding" element={<BrandingSettings />} />
      <Route path="domains" element={<DomainSettings />} />
      <Route path="permissions" element={<Navigate to="/owner/staff" replace />} />
      <Route path=":categoryId" element={<GuideSettings />} />
      <Route path="*" element={<Navigate to="/owner/settings" replace />} />
    </Route>
  </Routes>
)

export default Settings
