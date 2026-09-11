import { AIRPORT_LANDING_PATH, BUSINESS } from '../constants/site'
import { VEHICLE_CATEGORIES } from '../utils/vehicleCategories'

export const CASABLANCA_LANDING_PATH = '/location-voiture-casablanca'

/** FR local landing — Casablanca city intent (distinct from airport-only page). */
export const casablancaLanding = {
  path: CASABLANCA_LANDING_PATH,
  lang: 'fr',
  locale: 'fr_MA',
  title: 'Location voiture Casablanca | Americonfort',
  description:
    'Location de voiture à Casablanca avec Americonfort. Réservez en ligne, comparez les catégories et organisez la prise en charge dans la région de Casablanca — sans compte obligatoire.',
  h1: 'Location de voiture à Casablanca',
  lead:
    'Americonfort propose la location de voitures à Casablanca et dans sa région, avec une adresse de référence à l’Aéroport international Mohamed V. Consultez la flotte visible, choisissez vos dates et envoyez une demande de réservation en ligne.',
  sections: [
    {
      id: 'service',
      h2: 'Pourquoi réserver une voiture à Casablanca avec Americonfort',
      paragraphs: [
        'Casablanca est un hub d’affaires et de voyage. Americonfort met à disposition une flotte visible en ligne, avec des tarifs journaliers affichés et un parcours de réservation clair — sans créer de compte pour démarrer une demande.',
        'Notre point de contact public est situé à l’Aéroport international Mohamed V (Casablanca). Selon les lieux de prise en charge actifs configurés pour la flotte, vous pouvez organiser le départ et le retour dans les villes proposées sur le site.',
      ],
    },
    {
      id: 'how',
      h2: 'Comment réserver',
      steps: [
        'Parcourez la flotte ou filtrez par catégorie (Économique, Compacte, Berline, SUV, Luxe, Van…).',
        'Ouvrez une fiche véhicule pour voir les caractéristiques et le tarif journalier.',
        'Indiquez dates, lieux de prise / retour et vos coordonnées.',
        'Envoyez la demande — notamment via WhatsApp lorsque ce canal est disponible — puis attendez la confirmation.',
      ],
    },
    {
      id: 'airport',
      h2: 'Arrivée à l’aéroport Mohammed V (CMN)',
      paragraphs: [
        'Si vous atterrissez à Casablanca, consultez aussi notre page dédiée à la location près de l’aéroport Mohammed V pour un parcours orienté voyageurs CMN.',
      ],
      links: [
        { href: AIRPORT_LANDING_PATH, label: 'Location voiture aéroport Casablanca Mohammed V' },
      ],
    },
    {
      id: 'categories',
      h2: 'Catégories disponibles',
      paragraphs: [
        'Les catégories listées correspondent aux véhicules visibles sur le site. La disponibilité exacte dépend des dates et des lieux choisis.',
      ],
      categories: VEHICLE_CATEGORIES.slice(0, 8),
    },
  ],
  faq: [
    {
      question: 'Puis-je réserver une voiture à Casablanca sans compte ?',
      answer:
        'Oui. Le parcours public permet d’envoyer une demande de réservation en ligne sans créer de compte. L’agence confirme ensuite la réservation.',
    },
    {
      question: 'Où se situe Americonfort à Casablanca ?',
      answer: `L’adresse publique indiquée est ${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}. Les lieux de prise en charge proposés sur le site correspondent aux points actifs de la flotte.`,
    },
    {
      question: 'Comment contacter Americonfort ?',
      answer: `Téléphone : ${BUSINESS.telephoneDisplay}. E-mail : ${BUSINESS.email}.`,
    },
  ],
  cta: {
    primaryHref: '/cars',
    primaryLabel: 'Voir la flotte',
    secondaryHref: '/contact',
    secondaryLabel: 'Nous contacter',
  },
  contactLine: `${BUSINESS.telephoneDisplay} · ${BUSINESS.email}`,
}

export const casablancaBreadcrumbs = [
  { name: 'Accueil', path: '/' },
  { name: 'Location voiture Casablanca', path: CASABLANCA_LANDING_PATH },
]

export default casablancaLanding
