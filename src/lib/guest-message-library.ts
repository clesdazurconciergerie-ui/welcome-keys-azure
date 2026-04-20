// MODULE 1 — Voyageur Messaging Engine
// 6 templates pré-rédigés en français, activables en 1 clic depuis l'onglet "Bibliothèque".

import type { MessageTrigger } from "@/hooks/useGuestMessages";

export interface LibraryTemplate {
  name: string;
  trigger_type: MessageTrigger;
  subject: string;
  body_markdown: string;
  send_at_time: string;
}

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  {
    name: "Confirmation chaleureuse",
    trigger_type: "booking_confirmed",
    subject: "Votre réservation chez {{property_name}} est confirmée 🌟",
    send_at_time: "10:00",
    body_markdown: `Bonjour {{guest_first_name}},

Nous sommes ravis de vous accueillir prochainement à **{{property_name}}** !

Votre séjour est bien confirmé du **{{check_in_date}}** au **{{check_out_date}}**.

Nous vous enverrons les informations pratiques (adresse exacte, code d'accès, Wi-Fi, parking) **3 jours avant votre arrivée**.

D'ici là, n'hésitez pas à me contacter au {{concierge_phone}} pour toute question.

À très bientôt,
{{concierge_first_name}}`,
  },
  {
    name: "J-3 — Infos pratiques",
    trigger_type: "three_days_before",
    subject: "Votre séjour à {{property_name}} dans 3 jours",
    send_at_time: "10:00",
    body_markdown: `Bonjour {{guest_first_name}},

Plus que 3 jours avant votre arrivée à **{{property_name}}** !

**Infos pratiques :**
- 📍 Adresse : {{property_address}}
- 🕒 Check-in : à partir de {{check_in_time}}
- 🔑 Code d'accès : \`{{access_code}}\`
- 🚗 Parking : {{parking_info}}
- 📶 Wi-Fi : {{wifi_ssid}} / mot de passe : \`{{wifi_password}}\`

**Votre livret d'accueil digital :** [{{booklet_url}}]({{booklet_url}})

Il contient tout : restaurants locaux, plages, transports, équipements, contacts d'urgence.

Une question ? Je suis joignable au {{concierge_phone}}.

À très bientôt,
{{concierge_first_name}}`,
  },
  {
    name: "J-1 — Rappel arrivée",
    trigger_type: "day_before_arrival",
    subject: "À demain — votre séjour à {{property_name}}",
    send_at_time: "11:00",
    body_markdown: `Bonjour {{guest_first_name}},

Demain c'est le grand jour ! Vous êtes attendu(e) à **{{property_name}}** à partir de **{{check_in_time}}**.

**Rappels essentiels :**
- 📍 {{property_address}}
- 🔑 Code d'accès : \`{{access_code}}\`
- 📶 Wi-Fi : {{wifi_ssid}} / mot de passe : \`{{wifi_password}}\`

Si votre arrivée est retardée ou avancée, prévenez-moi au {{concierge_phone}}.

Bon voyage et à demain,
{{concierge_first_name}}`,
  },
  {
    name: "Jour J — Bienvenue",
    trigger_type: "check_in_day",
    subject: "Bienvenue à {{property_name}} 🌿",
    send_at_time: "15:30",
    body_markdown: `Bonjour {{guest_first_name}},

Bienvenue à **{{property_name}}** !

Le logement est prêt. Voici les essentiels pour votre arrivée :

- 🔑 Code d'accès : \`{{access_code}}\`
- 📶 Wi-Fi : {{wifi_ssid}} / mot de passe : \`{{wifi_password}}\`
- 📖 Livret digital : [{{booklet_url}}]({{booklet_url}})

Tout y est : équipements, restaurants, urgences, conseils locaux.

Pour toute question pendant votre séjour, je suis là : {{concierge_phone}}.

Excellent séjour !
{{concierge_first_name}}`,
  },
  {
    name: "J-1 départ — Instructions",
    trigger_type: "day_before_checkout",
    subject: "Votre départ demain — {{property_name}}",
    send_at_time: "17:00",
    body_markdown: `Bonjour {{guest_first_name}},

J'espère que votre séjour à **{{property_name}}** se passe à merveille !

Petit rappel : votre départ est prévu **demain avant {{check_out_time}}**.

**Avant de partir :**
- Fermez les fenêtres et volets
- Éteignez les lumières et la climatisation
- Laissez les clés à l'intérieur (la porte se verrouille automatiquement)

Une dernière question ? Contactez-moi au {{concierge_phone}}.

Bon retour,
{{concierge_first_name}}`,
  },
  {
    name: "J+1 — Demande d'avis",
    trigger_type: "one_day_after",
    subject: "Merci pour votre séjour {{guest_first_name}} ⭐",
    send_at_time: "11:00",
    body_markdown: `Bonjour {{guest_first_name}},

J'espère que votre séjour à **{{property_name}}** vous a comblé(e) !

Si vous avez 2 minutes, votre avis nous aiderait énormément :

- ⭐ [Laisser un avis sur Airbnb]({{review_link_airbnb}})
- ⭐ [Laisser un avis sur Booking]({{review_link_booking}})

C'est le meilleur moyen de soutenir notre travail et d'aider les futurs voyageurs.

Au plaisir de vous accueillir à nouveau,
{{concierge_first_name}}`,
  },
];
