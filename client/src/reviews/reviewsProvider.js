/**
 * Reviews data layer.
 *
 * Swap DEMO for a Google Business Profile provider later without redesigning
 * the ReviewsSection UI. Keep the normalized shape below stable.
 *
 * @typedef {Object} ReviewItem
 * @property {string} id
 * @property {string} authorName
 * @property {string|null} location
 * @property {string|null} profilePhotoUrl
 * @property {number} rating
 * @property {string} text
 * @property {string|null} relativeTime
 * @property {number|null} [time]
 *
 * @typedef {Object} ReviewsPayload
 * @property {'demo'|'google'} source
 * @property {number} rating
 * @property {number} totalReviews
 * @property {ReviewItem[]} reviews
 * @property {string|null} mapsUrl
 * @property {string|null} writeReviewUrl
 */

/** @type {'demo'|'google'} */
export const REVIEWS_SOURCE = 'demo'

const DEMO_AVATARS = {
  lea: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80',
  karim: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80',
  sofia: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&h=96&q=80',
  nassim: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=96&h=96&q=80',
  amina: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&h=96&q=80',
  thomas: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80',
}

/** Demo copy only — fictional customers for UI preview. Not real testimonials. */
const DEMO_BY_LANG = {
  en: {
    rating: 4.9,
    totalReviews: 128,
    reviews: [
      {
        id: 'demo-1',
        authorName: 'Léa M.',
        location: 'Paris',
        profilePhotoUrl: DEMO_AVATARS.lea,
        rating: 5,
        text: 'Airport pickup was seamless. The car was immaculate and the team explained everything clearly before we left.',
        relativeTime: '2 weeks ago',
      },
      {
        id: 'demo-2',
        authorName: 'Karim B.',
        location: 'Casablanca',
        profilePhotoUrl: DEMO_AVATARS.karim,
        rating: 5,
        text: 'Exactly the vehicle we reserved — clean, recent, and ready on time. Booking online took only a few minutes.',
        relativeTime: '1 month ago',
      },
      {
        id: 'demo-3',
        authorName: 'Sofia R.',
        location: 'Madrid',
        profilePhotoUrl: DEMO_AVATARS.sofia,
        rating: 5,
        text: 'Premium feel from start to finish. Transparent pricing, no surprises at the counter, and a smooth return.',
        relativeTime: '3 weeks ago',
      },
      {
        id: 'demo-4',
        authorName: 'Nassim E.',
        location: 'Rabat',
        profilePhotoUrl: DEMO_AVATARS.nassim,
        rating: 4,
        text: 'Very professional service for a business trip. Drop-off near the airport was flexible and well coordinated.',
        relativeTime: '5 days ago',
      },
      {
        id: 'demo-5',
        authorName: 'Amina K.',
        location: 'Marrakech',
        profilePhotoUrl: DEMO_AVATARS.amina,
        rating: 5,
        text: 'We needed a comfortable SUV for the family — communication was excellent and the car performed perfectly.',
        relativeTime: '2 months ago',
      },
      {
        id: 'demo-6',
        authorName: 'Thomas L.',
        location: 'Lyon',
        profilePhotoUrl: DEMO_AVATARS.thomas,
        rating: 5,
        text: 'Arrived late from a delayed flight and they still had everything prepared. That level of care stands out.',
        relativeTime: '6 weeks ago',
      },
    ],
  },
  fr: {
    rating: 4.9,
    totalReviews: 128,
    reviews: [
      {
        id: 'demo-1',
        authorName: 'Léa M.',
        location: 'Paris',
        profilePhotoUrl: DEMO_AVATARS.lea,
        rating: 5,
        text: 'Prise en charge à l’aéroport impeccable. Voiture impeccable et explications claires avant le départ.',
        relativeTime: 'Il y a 2 semaines',
      },
      {
        id: 'demo-2',
        authorName: 'Karim B.',
        location: 'Casablanca',
        profilePhotoUrl: DEMO_AVATARS.karim,
        rating: 5,
        text: 'Exactement le véhicule réservé — propre, récent et prêt à l’heure. Réservation en ligne très rapide.',
        relativeTime: 'Il y a 1 mois',
      },
      {
        id: 'demo-3',
        authorName: 'Sofia R.',
        location: 'Madrid',
        profilePhotoUrl: DEMO_AVATARS.sofia,
        rating: 5,
        text: 'Expérience premium du début à la fin. Tarifs clairs, aucune surprise au comptoir, retour fluide.',
        relativeTime: 'Il y a 3 semaines',
      },
      {
        id: 'demo-4',
        authorName: 'Nassim E.',
        location: 'Rabat',
        profilePhotoUrl: DEMO_AVATARS.nassim,
        rating: 4,
        text: 'Service très professionnel pour un déplacement d’affaires. Restitution près de l’aéroport bien organisée.',
        relativeTime: 'Il y a 5 jours',
      },
      {
        id: 'demo-5',
        authorName: 'Amina K.',
        location: 'Marrakech',
        profilePhotoUrl: DEMO_AVATARS.amina,
        rating: 5,
        text: 'Nous avions besoin d’un SUV confortable pour la famille — communication excellente, voiture parfaite.',
        relativeTime: 'Il y a 2 mois',
      },
      {
        id: 'demo-6',
        authorName: 'Thomas L.',
        location: 'Lyon',
        profilePhotoUrl: DEMO_AVATARS.thomas,
        rating: 5,
        text: 'Vol en retard, et pourtant tout était prêt à notre arrivée. Ce niveau d’attention fait vraiment la différence.',
        relativeTime: 'Il y a 6 semaines',
      },
    ],
  },
  es: {
    rating: 4.9,
    totalReviews: 128,
    reviews: [
      {
        id: 'demo-1',
        authorName: 'Léa M.',
        location: 'París',
        profilePhotoUrl: DEMO_AVATARS.lea,
        rating: 5,
        text: 'Recogida en el aeropuerto impecable. El coche estaba perfecto y nos explicaron todo con claridad.',
        relativeTime: 'Hace 2 semanas',
      },
      {
        id: 'demo-2',
        authorName: 'Karim B.',
        location: 'Casablanca',
        profilePhotoUrl: DEMO_AVATARS.karim,
        rating: 5,
        text: 'Exactamente el vehículo reservado — limpio, reciente y listo a tiempo. Reserva online muy rápida.',
        relativeTime: 'Hace 1 mes',
      },
      {
        id: 'demo-3',
        authorName: 'Sofia R.',
        location: 'Madrid',
        profilePhotoUrl: DEMO_AVATARS.sofia,
        rating: 5,
        text: 'Sensación premium de principio a fin. Precios claros, sin sorpresas en el mostrador y devolución sencilla.',
        relativeTime: 'Hace 3 semanas',
      },
      {
        id: 'demo-4',
        authorName: 'Nassim E.',
        location: 'Rabat',
        profilePhotoUrl: DEMO_AVATARS.nassim,
        rating: 4,
        text: 'Servicio muy profesional para un viaje de negocios. La devolución cerca del aeropuerto estuvo bien coordinada.',
        relativeTime: 'Hace 5 días',
      },
      {
        id: 'demo-5',
        authorName: 'Amina K.',
        location: 'Marrakech',
        profilePhotoUrl: DEMO_AVATARS.amina,
        rating: 5,
        text: 'Necesitábamos un SUV cómodo para la familia — excelente comunicación y el coche funcionó perfectamente.',
        relativeTime: 'Hace 2 meses',
      },
      {
        id: 'demo-6',
        authorName: 'Thomas L.',
        location: 'Lyon',
        profilePhotoUrl: DEMO_AVATARS.thomas,
        rating: 5,
        text: 'Llegamos tarde por un retraso de vuelo y aún así todo estaba preparado. Ese cuidado marca la diferencia.',
        relativeTime: 'Hace 6 semanas',
      },
    ],
  },
  ar: {
    rating: 4.9,
    totalReviews: 128,
    reviews: [
      {
        id: 'demo-1',
        authorName: 'Léa M.',
        location: 'باريس',
        profilePhotoUrl: DEMO_AVATARS.lea,
        rating: 5,
        text: 'الاستلام من المطار كان سلساً. السيارة نظيفة تماماً والفريق شرح كل شيء بوضوح قبل المغادرة.',
        relativeTime: 'منذ أسبوعين',
      },
      {
        id: 'demo-2',
        authorName: 'Karim B.',
        location: 'الدار البيضاء',
        profilePhotoUrl: DEMO_AVATARS.karim,
        rating: 5,
        text: 'نفس السيارة التي حجزناها — نظيفة وحديثة وجاهزة في الموعد. الحجز عبر الإنترنت استغرق دقائق فقط.',
        relativeTime: 'منذ شهر',
      },
      {
        id: 'demo-3',
        authorName: 'Sofia R.',
        location: 'مدريد',
        profilePhotoUrl: DEMO_AVATARS.sofia,
        rating: 5,
        text: 'تجربة راقية من البداية للنهاية. أسعار واضحة بلا مفاجآت عند الاستلام وإعادة سلسة.',
        relativeTime: 'منذ 3 أسابيع',
      },
      {
        id: 'demo-4',
        authorName: 'Nassim E.',
        location: 'الرباط',
        profilePhotoUrl: DEMO_AVATARS.nassim,
        rating: 4,
        text: 'خدمة احترافية جداً لرحلة عمل. التسليم قرب المطار كان مرناً ومنظماً جيداً.',
        relativeTime: 'منذ 5 أيام',
      },
      {
        id: 'demo-5',
        authorName: 'Amina K.',
        location: 'مراكش',
        profilePhotoUrl: DEMO_AVATARS.amina,
        rating: 5,
        text: 'احتجنا لسيارة SUV مريحة للعائلة — التواصل ممتاز والسيارة كانت مثالية طوال الرحلة.',
        relativeTime: 'منذ شهرين',
      },
      {
        id: 'demo-6',
        authorName: 'Thomas L.',
        location: 'ليون',
        profilePhotoUrl: DEMO_AVATARS.thomas,
        rating: 5,
        text: 'تأخرت الطائرة ووصلنا متأخرين ومع ذلك كان كل شيء جاهزاً. هذا الاهتمام يصنع الفرق.',
        relativeTime: 'منذ 6 أسابيع',
      },
    ],
  },
}

/** @returns {ReviewsPayload} */
export function getDemoReviewsPayload(language = 'en') {
  const pack = DEMO_BY_LANG[language] || DEMO_BY_LANG.en
  return {
    source: 'demo',
    rating: pack.rating,
    totalReviews: pack.totalReviews,
    reviews: pack.reviews,
    mapsUrl: null,
    writeReviewUrl: null,
  }
}

/**
 * Single entry point for the Reviews section.
 * Later: if REVIEWS_SOURCE === 'google', fetch from API and normalize to this shape.
 * @param {{ language?: string }} [opts]
 * @returns {Promise<ReviewsPayload>}
 */
export async function getReviewsPayload({ language = 'en' } = {}) {
  if (REVIEWS_SOURCE === 'google') {
    // Placeholder for future Google Business Profile integration.
    // return fetchGoogleReviewsPayload({ language })
    throw new Error('Google reviews provider is not configured yet.')
  }
  return getDemoReviewsPayload(language)
}
