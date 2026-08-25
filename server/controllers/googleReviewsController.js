/**
 * Public Google Business Profile reviews via Places API.
 * Requires GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID.
 * Never invents ratings or reviews — returns configured:false when unset.
 */

const CACHE_TTL_MS = Number(process.env.GOOGLE_REVIEWS_CACHE_MS || 6 * 60 * 60 * 1000)

let memoryCache = {
  at: 0,
  payload: null,
}

const writeReviewUrl = (placeId) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`

const mapsPlaceUrl = (placeId) =>
  `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`

const normalizeReview = (review) => {
  if (!review || typeof review !== 'object') return null
  const text = String(review.text || '').trim()
  const authorName = String(review.author_name || '').trim()
  const rating = Number(review.rating)
  if (!authorName || !Number.isFinite(rating)) return null
  return {
    authorName,
    authorUrl: review.author_url || null,
    profilePhotoUrl: review.profile_photo_url || null,
    rating: Math.min(5, Math.max(0, rating)),
    text,
    relativeTime: review.relative_time_description || null,
    time: typeof review.time === 'number' ? review.time : null,
    language: review.language || null,
  }
}

const fetchPlaceDetails = async (placeId, apiKey) => {
  const fields = ['name', 'rating', 'user_ratings_total', 'url', 'reviews'].join(',')
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', fields)
  url.searchParams.set('reviews_sort', 'most_relevant')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Google Places HTTP ${response.status}`)
  }
  const body = await response.json()
  if (body.status !== 'OK' || !body.result) {
    throw new Error(body.error_message || `Google Places status: ${body.status || 'UNKNOWN'}`)
  }
  return body.result
}

export const getGoogleReviews = async (_req, res) => {
  try {
    const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || '').trim()
    const placeId = String(process.env.GOOGLE_PLACE_ID || '').trim()

    if (!apiKey || !placeId) {
      return res.json({
        success: true,
        configured: false,
        rating: null,
        totalReviews: null,
        name: null,
        mapsUrl: null,
        writeReviewUrl: null,
        reviews: [],
      })
    }

    if (memoryCache.payload && Date.now() - memoryCache.at < CACHE_TTL_MS) {
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.json({ success: true, configured: true, cached: true, ...memoryCache.payload })
    }

    const result = await fetchPlaceDetails(placeId, apiKey)
    const reviews = (Array.isArray(result.reviews) ? result.reviews : [])
      .map(normalizeReview)
      .filter(Boolean)

    const rating = Number.isFinite(Number(result.rating)) ? Number(result.rating) : null
    const totalReviews = Number.isFinite(Number(result.user_ratings_total))
      ? Number(result.user_ratings_total)
      : null

    const payload = {
      name: result.name || null,
      rating,
      totalReviews,
      mapsUrl: result.url || mapsPlaceUrl(placeId),
      writeReviewUrl: writeReviewUrl(placeId),
      reviews,
      fetchedAt: new Date().toISOString(),
    }

    memoryCache = { at: Date.now(), payload }
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ success: true, configured: true, cached: false, ...payload })
  } catch (err) {
    console.error('[google-reviews]', err.message)
    if (memoryCache.payload) {
      res.setHeader('Cache-Control', 'public, max-age=60')
      return res.json({
        success: true,
        configured: true,
        cached: true,
        stale: true,
        ...memoryCache.payload,
      })
    }
    const placeId = String(process.env.GOOGLE_PLACE_ID || '').trim()
    return res.status(502).json({
      success: false,
      configured: true,
      message: 'Unable to load Google reviews right now.',
      rating: null,
      totalReviews: null,
      mapsUrl: placeId ? mapsPlaceUrl(placeId) : null,
      writeReviewUrl: placeId ? writeReviewUrl(placeId) : null,
      reviews: [],
    })
  }
}

export default { getGoogleReviews }
