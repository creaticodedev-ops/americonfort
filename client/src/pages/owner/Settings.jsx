import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SettingsLayout from './settings/SettingsLayout'
import SettingsHub from './settings/SettingsHub'
import BookingSettings from './settings/BookingSettings'
import WhatsAppSettings from './settings/WhatsAppSettings'
import DocumentsSettings from './settings/DocumentsSettings'
import InvoicesSettings from './settings/InvoicesSettings'
import GuideSettings from './settings/GuideSettings'

/**
 * Settings entry — hub + nested category pages.
 * Existing APIs and owner isolation are unchanged; this is navigation/UX only.
 */
const Settings = () => (
  <Routes>
    <Route element={<SettingsLayout />}>
      <Route index element={<SettingsHub />} />
      <Route path="booking" element={<BookingSettings />} />
      <Route path="whatsapp" element={<WhatsAppSettings />} />
      <Route path="documents" element={<DocumentsSettings />} />
      <Route path="invoices" element={<InvoicesSettings />} />
      <Route path=":categoryId" element={<GuideSettings />} />
      <Route path="*" element={<Navigate to="/owner/settings" replace />} />
    </Route>
  </Routes>
)

export default Settings
