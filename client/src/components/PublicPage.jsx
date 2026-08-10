import React from 'react'
import { Link } from 'react-router-dom'

/** Lightweight shared chrome for public trust / content pages. */
const PublicPage = ({
  eyebrow,
  title,
  lead,
  children,
  breadcrumbs = [],
}) => (
  <article className="page-pad page-shell py-10 sm:py-14 md:py-16 max-w-3xl">
    {breadcrumbs.length > 0 && (
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.path} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link to={crumb.path} className="hover:text-ink transition">
                  {crumb.name}
                </Link>
              ) : (
                <span className="text-ink">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )}
    {eyebrow && (
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80 mb-2 font-medium">
        {eyebrow}
      </p>
    )}
    <h1 className="font-display text-3xl sm:text-4xl text-ink font-medium leading-tight">
      {title}
    </h1>
    {lead && (
      <p className="mt-4 text-muted text-base sm:text-lg leading-relaxed font-light">
        {lead}
      </p>
    )}
    <div className="mt-8 prose-seo space-y-5 text-sm sm:text-[15px] text-ink/90 leading-relaxed">
      {children}
    </div>
  </article>
)

export default PublicPage
