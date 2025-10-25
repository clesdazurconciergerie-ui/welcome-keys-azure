// Enum canonique des sections de l'éditeur de livret
export type SectionKey =
  | 'general'       // Informations générales (adresse, ville, etc.)
  | 'identity'      // Identité / Branding : nom de conciergerie, logo
  | 'appearance'    // Apparence / Couleurs HEX, typo, layout
  | 'wifi'          // Wi-Fi (optionnel)
  | 'equipments'    // Équipements (+ photos)
  | 'nearby'        // À proximité
  | 'rules'         // Règles de la maison / check-in
  | 'chatbot';      // Chatbot / Q&A

// Table de routage avec alias (fix fautes & anciens liens)
export const SECTION_ALIASES: Record<string, SectionKey> = {
  // canoniques
  'general': 'general',
  'identity': 'identity',
  'appearance': 'appearance',
  'wifi': 'wifi',
  'equipments': 'equipments',
  'nearby': 'nearby',
  'rules': 'rules',
  'chatbot': 'chatbot',
  // alias historiques / fautes
  'identite': 'identity',
  'brand': 'identity',
  'apparance': 'appearance',    // << corrige la faute
  'theme': 'appearance',
  'equipement': 'equipments',
  'proximite': 'nearby',
  'regles': 'rules',
  'practical': 'general',
  'infos': 'general',
  'contacts': 'general',
};

// Normalise une section (gère les alias et les fautes)
export function normalizeSection(input?: string | null): SectionKey {
  const key = String(input || '').trim().toLowerCase();
  return SECTION_ALIASES[key] ?? 'general';
}

// Labels des onglets
export const SECTION_LABELS: Record<SectionKey, string> = {
  general: 'Informations',
  identity: 'Identité',
  appearance: 'Apparence',
  wifi: 'Wi-Fi',
  equipments: 'Équipements',
  nearby: 'À proximité',
  rules: 'Règles',
  chatbot: 'Chatbot',
};
