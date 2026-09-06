// MODULE — Estimation locative (Azur Keys Properties) · référentiels partagés
// Étape 1 : uniquement des structures. AUCUN coefficient, AUCUN prix codé en dur.

export type DataSource = "RDNA" | "WEB" | "AI" | "USER" | "CALCULATED" | "UNKNOWN";

export const SOURCE_LABEL: Record<DataSource, string> = {
  RDNA: "Rapport RDNA",
  WEB: "Trouvé automatiquement",
  AI: "Analysé par IA",
  USER: "Renseigné manuellement",
  CALCULATED: "Calculé",
  UNKNOWN: "Inconnu",
};

export const ESTIMATION_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "complete", label: "Informations complètes" },
  { value: "analyzing", label: "Analyse en cours" },
  { value: "analyzed", label: "Analyse terminée" },
  { value: "to_check", label: "À vérifier" },
  { value: "validated", label: "Validée" },
  { value: "report", label: "Rapport généré" },
] as const;

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  ESTIMATION_STATUSES.map((s) => [s.value, s.label]),
);

export const PROPERTY_TYPES = [
  "Appartement", "Studio", "Villa", "Maison", "Duplex", "Penthouse", "Autre",
];

export const FLOOR_OPTIONS = [
  { value: "rdc", label: "Rez-de-chaussée" },
  { value: "numeric", label: "Étage précis" },
  { value: "last", label: "Dernier étage" },
  { value: "unknown", label: "Étage inconnu" },
];

export const VIEW_OPTIONS = [
  "Aucune", "Ville", "Jardin", "Piscine", "Mer", "Vue mer partielle",
  "Vue mer panoramique", "Montagne", "Autre",
];

export const POOL_OPTIONS = [
  "Pas de piscine", "Piscine privée", "Piscine commune", "Piscine chauffée",
  "Piscine saisonnière", "Piscine accessible toute l'année", "Information inconnue",
];

export const PARKING_OPTIONS = [
  "Aucun", "Stationnement dans la rue", "Parking résidence", "Place privée",
  "Garage", "Plusieurs places",
];

export const AC_OPTIONS = ["Aucune", "Salon uniquement", "Certaines pièces", "Toutes les pièces"];

export const WIFI_OPTIONS = ["Oui", "Non", "Inconnu"];

export const EXTERIOR_OPTIONS = ["Balcon", "Terrasse", "Jardin", "Rooftop", "Patio"];

export const AMENITIES = [
  "Smart TV", "TV", "Netflix", "Lave-linge", "Sèche-linge", "Lave-vaisselle",
  "Four", "Micro-ondes", "Machine à café", "Chauffage", "Cheminée", "Baignoire",
  "Douche à l'italienne", "Jacuzzi", "Sauna", "Hammam", "Salle de sport",
  "Borne de recharge électrique", "Gardien", "Résidence sécurisée", "Portail",
  "Vidéosurveillance", "Équipements bébé", "Animaux acceptés",
];

export const MIN_STAY_OPTIONS = ["Flexible", "2 nuits", "3 nuits", "4 nuits", "5 nuits", "7 nuits"];

export const OWNER_STRATEGY_OPTIONS = [
  "Maximiser les revenus",
  "Maximiser l'occupation",
  "Équilibre revenus / occupation",
  "Location principalement à la semaine",
];

export const PETS_OPTIONS = ["Acceptés", "Refusés", "À définir"];

export const PHOTO_CATEGORIES = [
  "Extérieur", "Salon", "Cuisine", "Chambre", "Salle de bain", "Terrasse",
  "Piscine", "Vue", "Parking", "Autres",
];

// Axes de scoring interne — les pondérations seront définies à l'étape suivante.
export const SCORE_AXES = [
  { key: "standing", label: "Standing" },
  { key: "etat", label: "État" },
  { key: "design", label: "Design" },
  { key: "equipements", label: "Équipements" },
  { key: "localisation", label: "Localisation" },
  { key: "exterieurs", label: "Extérieurs" },
  { key: "vue", label: "Vue" },
  { key: "qualite_percue", label: "Qualité perçue" },
] as const;

export const SEASONS = [
  { key: "basse", label: "Basse saison" },
  { key: "moyenne", label: "Moyenne saison" },
  { key: "haute", label: "Très haute saison" },
] as const;

export const COMPARABLES_DISCLAIMER =
  "Les tarifs des logements comparables correspondent aux prix affichés publiquement sur les plateformes et ne constituent pas nécessairement les revenus effectivement perçus par les propriétaires.";
