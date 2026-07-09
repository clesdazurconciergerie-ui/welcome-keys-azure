## Objectif
Créer sur le nouveau projet Supabase (`adfdysfwowafvphwqenv`) l'ensemble du schéma requis par le code — **structure uniquement, aucune donnée métier** (aucune villa, aucun utilisateur pré-rempli, aucun exemple).

## Contexte
- 124 migrations existent dans `supabase/migrations/` mais elles supposent 5 tables de base créées auparavant par Lovable Cloud (`users`, `booklets`, `pins`, `plans`, `subscriptions`) — donc elles ne peuvent pas être rejouées telles quelles.
- Le code référence ~80 tables. Sans schéma, tout ce qui touche à la DB crashe.

## Stratégie
Une seule grande migration consolidée en 3 blocs, dans cet ordre :

1. **Bootstrap** — CREATE des 5 tables de base manquantes, avec toutes les colonnes reconstruites à partir des `ALTER`, `INSERT` et usages dans le code :
   - `users` (id, email, role, plan, booklet_quota, trial_expires_at, subscription_status, grace_period_ends_at, onboarding_completed, onboarding_completed_at, stripe_customer_id, timestamps…)
   - `booklets` (id, user_id, property_id, title, appearance jsonb, concierge_name, logo_url, wizard_step, is_complete, tagline, language, show_logo, google_maps_link, access_code, checkin/checkout_procedure, parking_info, safety_tips/instructions, manual_pdf_url, waste_location, sorting_instructions, cleaning_rules/tips, airbnb_license, disclaimer, gdpr_notice, gallery jsonb, nearby jsonb, unique_views_count, timestamps…)
   - `pins` (id, booklet_id, pin_code, status, timestamps)
   - `plans` (id, name, price, features jsonb…)
   - `subscriptions` (id, user_id, plan_id, stripe_subscription_id, status, current_period_end, timestamps)
   - `GRANT` + `ENABLE RLS` + policies auth-only sur chacune.

2. **Rejeu des 124 migrations existantes** dans leur ordre chronologique (elles créent les 75+ autres tables : properties, missions, mission_photos, ical_calendars, invoices, expenses, prospects, owners, service_providers, inspections, etc. + toutes leurs policies RLS et fonctions).

3. **Trigger `handle_new_user`** sur `auth.users` pour créer automatiquement la ligne `public.users` + `public.user_roles` à l'inscription (déjà défini dans les migrations, sera actif après rejeu).

## Livrable
Une migration SQL unique soumise via l'outil de migration. Après ton approbation et exécution, Supabase régénère automatiquement `src/integrations/supabase/types.ts` → toutes les erreurs TypeScript disparaissent → le site devient fonctionnel (vide, prêt à recevoir tes données).

## Risques assumés
- Reconstruction par rétro-ingénierie : quelques colonnes de `users`/`booklets`/`plans` pourraient être imparfaites (nom, default, nullable). Si une page du dashboard échoue après coup, on ajoute la colonne manquante en 30 secondes via une petite migration corrective.
- La migration fait ~270 KB. Si Supabase la rejette pour taille, on la découpe en 3-4 morceaux (bootstrap / core / features / RLS-hardening).

## Après exécution
- Fournir les liens : SQL Editor, Auth providers, Storage.
- Vérifier le build TypeScript.
- Recommander de créer un premier compte via `/auth` pour tester le trigger `handle_new_user`.

## Non inclus
- Aucune donnée métier (villas, propriétaires, prestataires, réservations…).
- Aucun bucket Storage (à créer séparément si besoin : `logos`, `mission-photos`, `owner-documents`, `property-photos`, `branding`).
- Aucun secret / clé externe (déjà configurés).
