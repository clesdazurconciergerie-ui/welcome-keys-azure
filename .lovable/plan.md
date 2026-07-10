## Module: Rapport de performance mensuelle Airbnb

Nouveau module accessible depuis la navigation principale du dashboard, permettant de générer des rapports mensuels premium à partir de screenshots Airbnb + saisie manuelle, avec analyse IA et export PDF.

### Navigation & routes

- Nouvelle entrée sidebar "Rapports Airbnb" (icône `FileBarChart`)
- Routes:
  - `/dashboard/rapports-airbnb` — liste des rapports (tous logements)
  - `/dashboard/rapports-airbnb/nouveau` — wizard 5 étapes
  - `/dashboard/rapports-airbnb/:reportId` — vue rapport + bouton PDF
  - `/dashboard/rapports-airbnb/logement/:propertyId` — historique par logement avec évolution mois par mois

### Base de données

Table `airbnb_reports`:
- `id`, `user_id`, `property_id` (FK properties), `period_start`, `period_end`, `period_label` (ex: "Octobre 2026")
- `kpi_data` jsonb — impressions, vues, ctr, réservations, taux_conversion, revenus, nuits_reservees, taux_occupation, prix_moyen_nuit, annulations (chaque valeur avec `{ value, confidence, source: 'extracted'|'manual'|'missing' }`)
- `manual_data` jsonb — commentaires voyageurs, actions conciergerie, objectif mensuel
- `analysis_text` jsonb — 9 sections générées (resume, kpi_summary, tunnel, commercial, diagnostic, recommandations, plan_action, conclusion)
- `screenshot_urls` text[] — chemins Supabase Storage
- `status` — `draft` | `completed`
- `created_at`, `updated_at`

Bucket Storage: `airbnb-screenshots` (privé, RLS par user_id).

RLS: user_id = auth.uid() sur toutes les opérations.

### Edge functions

1. **`extract-airbnb-stats`** — reçoit urls des screenshots (signed URLs), appelle Lovable AI Gateway avec `google/gemini-2.5-flash` en vision multimodale, retourne JSON structuré `{ metric: { value, confidence } }`. Prompt strict: "ne jamais inventer, retourner null si non visible".
2. **`generate-airbnb-report`** — reçoit données validées + rapport précédent (si existe), appelle Gemini pour générer les 9 sections en JSON structuré. Utilise `google/gemini-2.5-pro` pour qualité rédactionnelle.

### Wizard 5 étapes

**Composant** `AirbnbReportWizard.tsx` avec stepper visuel, state local partagé.

1. **Import** — dropzone (drag & drop), aperçu miniatures, upload vers bucket
2. **Extraction** — loader animé pendant appel edge function, affichage des chiffres détectés
3. **Validation** — form éditable, badges "à vérifier" (orange) pour confidence < 0.7, "donnée manquante" pour null
4. **Complément manuel** — sélecteur logement (dropdown properties existantes), champs période/ville/objectif/commentaires/actions
5. **Génération** — appel edge function, redirection vers vue rapport

### Vue rapport (9 sections)

Composant `AirbnbReportView.tsx`, style monochrome Azurkeys existant (noir/blanc, Cinzel/Josefin/JetBrains, radius 0):

1. Couverture — logo + méta
2. Résumé exécutif
3. Cartes KPI (grille) — "non disponible ce mois" si null
4. Tunnel conversion — funnel simple (SVG ou Recharts)
5. Analyse commerciale — comparaison mois précédent si dispo
6. Diagnostic — 4 colonnes (fonctionne/bloque/risques/opportunités)
7. Recommandations — liste catégorisée
8. Plan d'action — 3-5 items avec priorité + impact
9. Conclusion propriétaire

Bouton "Télécharger PDF" → `window.print()` avec CSS `@media print` A4 optimisé (approche simple, cohérente avec le stack existant, pas de nouvelle dépendance).

### Règles IA (non-négociables)

- Extraction: prompt exige `null` explicite pour valeurs non visibles + score de confiance 0-1
- Génération: prompt inclut seulement données non-null; instruction "signaler données indisponibles, ne jamais extrapoler"
- Ton défini dans system prompt: professionnel, rassurant, non-technique, honnête

### Ordre d'implémentation

1. Migration table `airbnb_reports` + bucket `airbnb-screenshots` + RLS
2. Route + entrée sidebar + page liste (vide au départ)
3. Wizard étape 1 (upload) + étape 4-5 UI (sans IA)
4. Edge function `extract-airbnb-stats` + étape 2-3
5. Edge function `generate-airbnb-report` + vue rapport
6. Export PDF via print CSS
7. Historique par logement avec comparaison mois-à-mois

### Confirmation nécessaire

- OK pour utiliser **Lovable AI Gateway** (Gemini 2.5 Flash pour vision, Gemini 2.5 Pro pour rédaction) — la clé `LOVABLE_API_KEY` est déjà configurée, pas besoin d'ajouter de secret.
- OK pour l'export PDF via `window.print()` + CSS print (pas de nouvelle lib) plutôt que react-pdf, plus simple et cohérent avec le stack ?
