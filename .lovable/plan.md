# Plan : E-Calendar Auto-Sync + États des Lieux Flexibles

Vu l'ampleur (3 modules majeurs, ~15 tables/triggers, 3 edge functions, 4 pages UI, 6 améliorations "wow"), je propose un découpage en **5 lots livrables séparément**. Chaque lot est testable indépendamment.

---

## 📦 LOT 1 — Infrastructure E-Calendar Auto-Sync (DB + Cron)

**Migrations** :
- Table `ical_sync_history` (audit complet de chaque sync)
- Table `ical_sync_queue` (retries intelligents avec priorité)
- Colonnes ajoutées à `ical_calendars` : `last_sync_at`, `last_sync_status`, `sync_health_score`, `consecutive_failures`, `is_sync_enabled`, `sync_frequency_hours`
- Fonction `update_calendar_health_score()` (trigger après insert sur `ical_sync_history`)
- RLS strictes (user_id = auth.uid())

**Edge Functions** :
- `auto-sync-ical-daily` : scanne calendriers actifs, ajoute à la queue, traite batch de 5
- Renforcement de `sync-ical` existante : log dans `ical_sync_history`, gestion timeout 30s, retry logic
- Cron pg_cron quotidien 08h00 Europe/Paris

---

## 📦 LOT 2 — UI Monitoring iCal (`/dashboard/ical-monitoring`)

- KPI cards (calendriers actifs, dernière sync, taux succès 7j, health moyen)
- Tableau calendriers avec filtres + actions (sync now, toggle auto-sync)
- Timeline historique 50 dernières sync + drawer détail
- Composant réutilisable `CalendarHealthBadge` (4 niveaux)
- Bouton "Forcer sync globale"
- Lien sidebar PILOTAGE avec icône `RefreshCw`

---

## 📦 LOT 3 — Infrastructure États des Lieux (DB + Triggers)

**Migrations** :
- Table `property_inspections` avec **double datation** (`official_date` vs `actual_created_at`), versioning, signatures
- Table `inspection_items` (pièces/items avec condition)
- Table `inspection_photos` avec double datation héritée
- Table `inspection_audit_log` (audit trail complet)
- Trigger `log_inspection_date_change` : journalise tout changement d'`official_date`
- Trigger `inherit_official_date` : photos héritent de la date inspection
- Trigger `audit_inspection_changes` : log toutes les modifs majeures
- Bucket Storage `inspection-photos` (privé, RLS par user_id)

**Note** : Le projet a déjà une table `inspections` legacy. Je crée `property_inspections` en parallèle (nouveau modèle flexible) sans casser l'existant. Migration des données existantes dans un lot ultérieur si demandé.

---

## 📦 LOT 4 — UI États des Lieux Flexibles

- Page liste `/dashboard/inspections-v2` (sidebar OPÉRATIONS) avec badge "⚠️ Antidaté" si écart
- `CreateInspectionDialog` avec sélecteur date officielle + alerte antidatage + suggestions auto selon booking
- Page détail `/dashboard/inspections-v2/:id` (3 tabs : Photos & Pièces / Items / Historique)
- `InspectionPhotoUpload` (héritage date auto, upload Supabase Storage)
- Détection conflits (date entry > check_in, exit < check_out)
- Export PDF html2pdf avec date officielle + section audit trail si antidatage

---

## 📦 LOT 5 — Back-Office Admin + Améliorations "Wow"

- Page `/dashboard/admin/inspections` (admins only via `has_role`) avec colonne "Écart"
- Templates checklist par type de bien (`appartement_2p`, `villa`, etc.)
- Comparaison visuelle Entry/Exit (même booking) avec diff conditions
- Widget statistiques inspections (count mois, temps moyen, % validées 24h)
- (Optionnel) OCR compteurs via Lovable AI Gateway vision

---

## Conventions techniques (toutes phases)

- **Tokens HSL uniquement** : `text-foreground`, `bg-primary`, `text-accent`, badges via `bg-{color}-100 dark:bg-{color}-900/20` autorisés pour status sémantique
- **RLS** : explicite `user_id = auth.uid()` (pas de `auth.uid() IS NOT NULL`)
- **TypeScript strict**, React Query avec invalidation, skeletons sur loading
- **Mobile-first** (testé 992px et inférieur)
- **DemoContext** : intercepte les mutations en mode démo
- **DashboardErrorBoundary** sur nouvelles routes
- **Functions DB** : `SET search_path = public`

---

## ❓ Question pratique avant de démarrer

Le scope est énorme (~30+ fichiers, 4 migrations majeures, 3 edge functions). **Par quel lot veux-tu que je commence ?**

- **Lot 1 + 2** (E-Calendar : infra + monitoring UI) — ~6-8 fichiers
- **Lot 3 + 4** (États des lieux : infra + UI MVP) — ~10-12 fichiers
- **Tout en séquence** (Lot 1 → 5) sans pause — risque de timeout / d'erreurs en cascade, je recommande de valider lot par lot

Réponds par exemple **"go lot 1+2"** puis **"go lot 3+4"** ensuite, c'est plus sûr et tu peux tester entre les deux.