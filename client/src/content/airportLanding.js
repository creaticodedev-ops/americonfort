import { AIRPORT_LANDING_PATH, BUSINESS } from '../constants/site'
import { VEHICLE_CATEGORIES } from '../utils/vehicleCategories'

/** FR-first local landing content — only verified Americonfort capabilities. */
export const airportLanding = {
  path: AIRPORT_LANDING_PATH,
  lang: 'fr',
  locale: 'fr_MA',
  title: 'Location voiture aéroport Casablanca Mohammed V | Americonfort',
  description:
    'Location de voiture à l’aéroport Mohammed V (Casablanca) avec Americonfort. Réservez en ligne, choisissez votre catégorie et organisez la prise en charge près de CMN — sans compte obligatoire.',
  h1: 'Location de voiture à l’aéroport Casablanca Mohammed V',
  lead:
    'Americonfort propose la location de voitures au Maroc avec une adresse de référence à l’Aéroport international Mohamed V, Casablanca. Parcourez la flotte, sélectionnez vos dates et envoyez une demande de réservation en ligne.',
  sections: [
    {
      id: 'service',
      h2: 'Location voiture aéroport Casablanca avec Americonfort',
      paragraphs: [
        'Americonfort est un service de location de voitures premium au Maroc. Notre coordonnée publique est située à l’Aéroport international Mohamed V, Casablanca — un point d’ancrage clair pour les voyageurs qui arrivent ou repartent via CMN.',
        'Sur le site, vous consultez les véhicules visibles, filtrez par catégorie, choisissez une ville et des dates, puis réservez sans créer de compte. Les tarifs journaliers et les éventuels frais de livraison liés aux lieux de prise / retour s’affichent dans le parcours de réservation.',
      ],
    },
    {
      id: 'pickup',
      h2: 'Prise en charge et retour',
      paragraphs: [
        'La réservation se fait en ligne : vous choisissez le véhicule, le lieu de prise en charge, le lieu de retour (lorsqu’autorisé), ainsi que les dates et horaires.',
        'Les lieux proposés correspondent aux points de prise en charge actifs configurés pour la flotte (villes et adresses gérées dans le système). Les frais de livraison éventuels apparaissent clairement avant l’envoi de la demande.',
        'Après la demande, l’équipe Americonfort confirme la réservation. Selon le parcours, une finalisation (documents, dépôt de garantie remboursable selon le véhicule, signature) peut être proposée via un lien sécurisé.',
      ],
    },
    {
      id: 'booking',
      h2: 'Comment réserver en quelques étapes',
      steps: [
        'Parcourez la flotte ou filtrez par catégorie (Économique, Compacte, Berline, SUV, Luxe, Van, etc.).',
        'Ouvrez la fiche du véhicule pour voir les caractéristiques, le tarif journalier et le formulaire de réservation.',
        'Indiquez dates, lieux de prise / retour et vos coordonnées (nom, e-mail, téléphone).',
        'Envoyez la demande — notamment via WhatsApp lorsque ce canal est disponible — puis attendez la confirmation de l’agence.',
      ],
    },
    {
      id: 'categories',
      h2: 'Catégories de véhicules disponibles',
      paragraphs: [
        'Selon la disponibilité du moment, la flotte Americonfort peut inclure les catégories suivantes. Seuls les véhicules marqués visibles sur le site apparaissent dans le catalogue public.',
      ],
      categories: VEHICLE_CATEGORIES.filter((c) => c !== 'Other'),
    },
  ],
  faq: [
    {
      question: 'Proposez-vous la location de voiture à l’aéroport Mohammed V ?',
      answer:
        'Oui. L’adresse publique d’Americonfort est l’Aéroport international Mohamed V, Casablanca. Vous réservez en ligne et organisez la prise en charge via les lieux actifs proposés lors de la réservation.',
    },
    {
      question: 'Faut-il un compte pour réserver ?',
      answer:
        'Non. La demande de réservation publique ne nécessite pas de créer un compte client.',
    },
    {
      question: 'Comment connaître le prix total ?',
      answer:
        'Le tarif journalier est affiché sur chaque véhicule. Après sélection des dates et des lieux, un aperçu du prix (location et frais de livraison éventuels) est calculé avant l’envoi de la demande.',
    },
    {
      question: 'Quels documents ou dépôt peuvent être demandés ?',
      answer:
        'Après acceptation de la demande, un parcours de finalisation peut demander des documents et mentionner un dépôt de garantie remboursable (à partir de 5 000 MAD selon le véhicule, comme indiqué dans l’application). Les détails exacts sont communiqués lors de la confirmation.',
    },
    {
      question: 'Puis-je choisir une catégorie précise (SUV, berline, économique…) ?',
      answer:
        'Oui. La page flotte permet de filtrer par catégorie, puis d’ouvrir le véhicule souhaité pour réserver.',
    },
  ],
  cta: {
    primaryLabel: 'Voir les voitures disponibles',
    primaryHref: '/cars',
    secondaryLabel: 'Nous contacter',
    secondaryHref: '/contact',
  },
  contactLine: `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, Maroc · ${BUSINESS.telephoneDisplay} · ${BUSINESS.email}`,
}

export default airportLanding
