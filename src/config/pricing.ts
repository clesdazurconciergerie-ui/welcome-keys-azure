export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  livrets: string;
  badge?: string;
  features: string[];
  cta: string;
  order: number;
  is_featured?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "9,90",
    livrets: "1 livret",
    features: [
      "Code PIN unique",
      "QR code à imprimer",
      "Chatbot inclus",
      "Support par email",
    ],
    cta: "Commencer maintenant",
    order: 1,
  },
  {
    id: "pro",
    name: "Pro",
    price: "24,90",
    livrets: "1 à 5 livrets",
    badge: "⭐ Populaire",
    features: [
      "Branding personnalisé",
      "Couleurs HEX + logo",
      "Support prioritaire",
      "Chatbot avancé",
    ],
    cta: "Commencer maintenant",
    order: 2,
    is_featured: true,
  },
  {
    id: "business",
    name: "Business",
    price: "49,90",
    livrets: "5 à 25 livrets",
    features: [
      "Multi-utilisateurs",
      "Gestion centralisée",
      "Tableaux de bord analytiques",
      "Support dédié",
    ],
    cta: "Commencer maintenant",
    order: 3,
  },
  {
    id: "premium",
    name: "Premium",
    price: "99,90",
    livrets: "Illimité",
    features: [
      "Domaine personnalisé",
      "API et export avancé",
      "Support prioritaire 24/7",
      "Accès bêta fonctionnalités",
    ],
    cta: "Commencer maintenant",
    order: 4,
  },
];

export const paymentLinks: Record<string, string> = {
  starter: 'https://buy.stripe.com/cNi5kDeMB6Cd8htgEQ5kk00',
  pro: 'https://buy.stripe.com/7sYfZh9sh4u57dpgEQ5kk01',
  business: 'https://buy.stripe.com/14A4gzbAp6CdcxJcoA5kk02',
  premium: 'https://buy.stripe.com/bJe5kD5c1aStdBN2O05kk03',
};
