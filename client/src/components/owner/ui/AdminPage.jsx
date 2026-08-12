import React from 'react'
import { Link } from 'react-router-dom'

export const AdminPage = ({ children, className = '' }) => (
  <div className={`admin-page-inner px-4 py-5 sm:px-6 lg:px-8 xl:px-10 pb-14 min-w-0 flex-1 ${className}`}>
    {children}
  </div>
)

export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}) => (
  <header className={`admin-page-header mb-6 ${className}`}>
    {breadcrumbs?.length ? (
      <nav className="admin-breadcrumbs mb-2" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--admin-fg-muted)]">
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="opacity-50">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-[var(--admin-fg)] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--admin-fg-secondary)]">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    ) : null}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="admin-page-title text-[1.375rem] sm:text-[1.5rem] font-semibold tracking-tight text-[var(--admin-fg)] leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-[var(--admin-fg-secondary)] max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  </header>
)

export default AdminPage
