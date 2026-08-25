import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Title from './Title'
import { useI18n } from '../i18n/I18nContext'

const AUTOPLAY_MS = 6500
const SWIPE_THRESHOLD = 48

const GoogleMark = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

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

const GoogleReviews = () => {
  const { t, isRtl } = useI18n()
  const [payload, setPayload] = useState(null)
  const [status, setStatus] = useState('loading')
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
        const { data } = await axios.get('/api/public/google-reviews')
        if (cancelled) return
        if (!data?.configured) {
          setStatus('idle')
          setPayload(null)
          return
        }
        const reviews = Array.isArray(data.reviews) ? data.reviews.filter((r) => r?.authorName) : []
        const hasRating = Number.isFinite(Number(data.rating))
        if (!hasRating && reviews.length === 0 && !data.mapsUrl && !data.writeReviewUrl) {
          setStatus('idle')
          setPayload(null)
          return
        }
        setPayload({
          rating: hasRating ? Number(data.rating) : null,
          totalReviews: Number.isFinite(Number(data.totalReviews)) ? Number(data.totalReviews) : null,
          mapsUrl: data.mapsUrl || null,
          writeReviewUrl: data.writeReviewUrl || null,
          reviews,
        })
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        const data = err?.response?.data
        if (data?.configured && (data.mapsUrl || data.writeReviewUrl)) {
          setPayload({
            rating: Number.isFinite(Number(data.rating)) ? Number(data.rating) : null,
            totalReviews: Number.isFinite(Number(data.totalReviews))
              ? Number(data.totalReviews)
              : null,
            mapsUrl: data.mapsUrl || null,
            writeReviewUrl: data.writeReviewUrl || null,
            reviews: Array.isArray(data.reviews) ? data.reviews.filter((r) => r?.authorName) : [],
          })
          setStatus('ready')
          return
        }
        setStatus('idle')
        setPayload(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reviews = payload?.reviews || []
  const count = reviews.length
  const ratingLabel = formatRating(payload?.rating)

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
    if (status !== 'ready' || count < 2 || paused || reducedMotion) return undefined
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % count)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [status, count, paused, reducedMotion])

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

  if (status === 'loading' || status === 'idle' || !payload) {
    if (status === 'loading') {
      return <section className="g-reviews g-reviews--loading" aria-hidden="true" />
    }
    return null
  }

  const totalLabel =
    payload.totalReviews != null
      ? t('testimonials.reviewCount', { count: payload.totalReviews })
      : null

  const trackOffset = isRtl ? index * 100 : -index * 100

  return (
    <section className="g-reviews page-pad page-shell" aria-label={t('testimonials.title')}>
      <Title
        eyebrow={t('testimonials.eyebrow')}
        title={t('testimonials.title')}
        subTitle={t('testimonials.subtitle')}
      />

      <div className="g-reviews-layout">
        <aside className="g-reviews-summary">
          <div className="g-reviews-summary-brand">
            <GoogleMark className="g-reviews-google-mark" />
            <span>{t('testimonials.googleLabel')}</span>
          </div>

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
            {payload.mapsUrl && (
              <a
                className="g-reviews-cta"
                href={payload.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('testimonials.seeAll')}
              </a>
            )}
            {payload.writeReviewUrl && (
              <a
                className="g-reviews-cta-secondary"
                href={payload.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('testimonials.shareExperience')}
              </a>
            )}
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
                      key={`${review.authorName}-${review.time || i}`}
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
                    {reviews.map((_, i) => (
                      <button
                        key={i}
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
    </section>
  )
}

export default GoogleReviews
