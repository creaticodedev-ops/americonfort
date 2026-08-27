import React, { useCallback, useEffect, useRef, useState } from 'react'
import Title from './Title'
import { useI18n } from '../i18n/I18nContext'
import { getReviewsPayload } from '../reviews/reviewsProvider'

const AUTOPLAY_MS = 6500
const SWIPE_THRESHOLD = 48

const StarRow = ({ rating = 5, size = 'md' }) => {
  const full = Math.round(Math.min(5, Math.max(0, Number(rating) || 0)))
  const starSize = size === 'lg' ? 18 : 14
  return (
    <div className="g-reviews-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
          className={i < full ? 'is-on' : 'is-off'}
        >
          <path d="M12 2.5l2.9 6.1 6.7.9-4.8 4.6 1.2 6.6L12 17.8 6 20.7l1.2-6.6L2.4 9.5l6.7-.9L12 2.5z" />
        </svg>
      ))}
    </div>
  )
}

const initialsFromName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

const formatRating = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return (Math.round(n * 10) / 10).toFixed(1)
}

/**
 * Premium reviews carousel. Data comes from reviewsProvider —
 * swap demo → Google there without redesigning this UI.
 */
const ReviewsSection = () => {
  const { t, language, isRtl } = useI18n()
  const [payload, setPayload] = useState(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const touchStartX = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getReviewsPayload({ language })
        if (cancelled) return
        setPayload(data)
        setIndex(0)
      } catch {
        if (!cancelled) setPayload(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [language])

  const reviews = payload?.reviews || []
  const count = reviews.length
  const ratingLabel = formatRating(payload?.rating)
  const isDemo = payload?.source === 'demo'

  const goTo = useCallback(
    (next) => {
      if (!count) return
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  const goNext = useCallback(() => goTo(index + 1), [goTo, index])
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    if (!payload || count < 2 || paused || reducedMotion) return undefined
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % count)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [payload, count, paused, reducedMotion])

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches?.[0]?.clientX ?? null
  }

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const endX = e.changedTouches?.[0]?.clientX
    if (endX == null) return
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (isRtl) {
      if (delta > 0) goNext()
      else goPrev()
    } else if (delta > 0) {
      goPrev()
    } else {
      goNext()
    }
  }

  if (!payload) {
    return <section className="g-reviews g-reviews--loading" aria-hidden="true" />
  }

  const totalLabel =
    payload.totalReviews != null
      ? t('testimonials.reviewCount', { count: payload.totalReviews })
      : null

  const trackOffset = isRtl ? index * 100 : -index * 100

  return (
    <section className="ac-section g-reviews" aria-label={t('testimonials.title')}>
      <div className="page-pad page-shell">
      <Title
        align="left"
        eyebrow={t('testimonials.eyebrow')}
        title={t('testimonials.title')}
        subTitle={t('testimonials.subtitle')}
      />

      <div className="g-reviews-layout">
        <aside className="g-reviews-summary">
          {isDemo && <p className="g-reviews-demo-badge">{t('testimonials.demoBadge')}</p>}

          {ratingLabel != null && (
            <div className="g-reviews-score" aria-label={`${ratingLabel} ${t('testimonials.outOfFive')}`}>
              <span className="g-reviews-score-value">{ratingLabel}</span>
              <span className="g-reviews-score-denom">/ 5</span>
            </div>
          )}

          {ratingLabel != null && <StarRow rating={payload.rating} size="lg" />}

          {totalLabel && <p className="g-reviews-total">{totalLabel}</p>}
          <p className="g-reviews-attribution">{t('testimonials.basedOn')}</p>

          <div className="g-reviews-actions">
            {payload.mapsUrl ? (
              <a
                className="ac-text-link"
                href={payload.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('testimonials.seeAll')}
              </a>
            ) : null}
            {payload.writeReviewUrl ? (
              <a
                className="ac-text-link"
                href={payload.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('testimonials.shareExperience')}
              </a>
            ) : null}
          </div>
        </aside>

        <div
          className="g-reviews-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
          }}
        >
          {count === 0 ? (
            <p className="g-reviews-empty">{t('testimonials.empty')}</p>
          ) : (
            <>
              <div
                className="g-reviews-viewport"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <div
                  className="g-reviews-track"
                  style={{ transform: `translateX(${trackOffset}%)` }}
                >
                  {reviews.map((review, i) => (
                    <article
                      key={review.id || `${review.authorName}-${i}`}
                      className="g-reviews-card"
                      aria-hidden={i !== index}
                    >
                      <header className="g-reviews-card-head">
                        {review.profilePhotoUrl ? (
                          <img
                            className="g-reviews-avatar"
                            src={review.profilePhotoUrl}
                            alt=""
                            width={44}
                            height={44}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="g-reviews-avatar g-reviews-avatar--fallback" aria-hidden="true">
                            {initialsFromName(review.authorName)}
                          </span>
                        )}
                        <div className="g-reviews-card-meta">
                          <p className="g-reviews-author">{review.authorName}</p>
                          {review.location && (
                            <p className="g-reviews-location">{review.location}</p>
                          )}
                          <div className="g-reviews-card-sub">
                            <StarRow rating={review.rating} />
                            {review.relativeTime && (
                              <time className="g-reviews-date">{review.relativeTime}</time>
                            )}
                          </div>
                        </div>
                      </header>
                      {review.text ? (
                        <p className="g-reviews-text">“{review.text}”</p>
                      ) : (
                        <p className="g-reviews-text g-reviews-text--muted">{t('testimonials.noText')}</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>

              {count > 1 && (
                <div className="g-reviews-nav">
                  <button
                    type="button"
                    className="g-reviews-arrow"
                    onClick={goPrev}
                    aria-label={t('testimonials.prev')}
                  >
                    <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
                  </button>
                  <div className="g-reviews-progress" role="tablist" aria-label={t('testimonials.progress')}>
                    {reviews.map((review, i) => (
                      <button
                        key={review.id || i}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        className={`g-reviews-dot${i === index ? ' is-active' : ''}`}
                        onClick={() => goTo(i)}
                        aria-label={t('testimonials.slide', { n: i + 1 })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="g-reviews-arrow"
                    onClick={goNext}
                    aria-label={t('testimonials.next')}
                  >
                    <span aria-hidden="true">{isRtl ? '←' : '→'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </section>
  )
}

export default ReviewsSection
