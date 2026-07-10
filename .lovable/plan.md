
# Module Estimation locative Azurkeys — Audit & plan d'intégration

Le prompt exige de ne PAS coder avant validation des étapes 1 (audit) et 2 (faisabilité). Voici le résultat de ces deux étapes. Je n'écrirai aucun code tant que tu n'as pas validé.

---

## Étape 1 — Audit du projet existant

**Stack technique**
- React 18 + Vite 5 + TypeScript 5, Tailwind v3, shadcn/ui, react-router-dom v6.
- Backend : Supabase (projet `adfdysfwowafvphwqenv`) + Edge Functions Deno. Aucun serveur Node/Flask.
- IA : Lovable AI Gateway (`LOVABLE_API_KEY` déjà présente) + `OPENAI_API_KEY` (secret configuré).
- PDF existants : `html2pdf.js` (livrets, factures, inspections) et `window.print()` déjà utilisé ailleurs. Pas de moteur de pagination JS.

**Routes & espaces**
- `/dashboard` (conciergerie, super_admin) · `/proprietaire` (owner) · `/prestataire` (SP) · `/demo` · `/rapports` (**module Azurkeys Report déjà scaffolded** : `RapportsLayout` + `RapportsHome` + `LogementsAdminPage`, tables `azurkeys_properties` / `azurkeys_reports`, thème scoped `.azurkeys-scope` avec Cormorant + Montserrat).
- Auth : Supabase email/password, rôles via `user_roles` + `has_role()`. Compte `clesdazur.conciergerie@gmail.com` = super_admin.

**Charte projet actuelle** (mémoire) : monochrome noir/blanc, Cinzel/Josefin/JetBrains, radius 0, shadow none. Le sous-module `/rapports` a déjà sa charte scoped (`Cormorant Garamond` + `Montserrat`, palette sable). Le prompt Estimation impose **Playfair Display + Cormorant italique + Inter** + fond `#F5F5F0` + pin rouge `#C0392B` — c'est un 3ème sous-système typo, **scoped au module uniquement**, comme déjà fait pour `.azurkeys-scope`.

**Moteur d'estimation existant** : aucun. `usePricingRules` gère la tarification opérationnelle (nightly pricing runtime), pas d'estimation locative prospective. Rien à réutiliser côté calcul.

**Dépendances déjà installées utilisables**
- `html2pdf.js`, `jsPDF` (via html2pdf), `zod`, `sonner`, `@tanstack/react-query`, `lucide-react`.
- Manquantes : `leaflet` + `react-leaflet` (carte), fonts Playfair/Cormorant/Inter (Google Fonts via `<link>`).

---

## Étape 2 — Rapport de faisabilité

**Réutilisable tel quel**
- `RapportsLayout` + route `/rapports` + navigation + auth existante.
- Table `azurkeys_properties` (bien réel du portefeuille).
- Pipeline Edge Functions Supabase (calculate, extract-airdna, geocode, market-research, recommendations, enhance).
- Secrets déjà présents : `LOVABLE_API_KEY`, `OPENAI_API_KEY`. Nominatim = public, pas de secret.

**À créer** (nouveaux fichiers, aucun existant modifié en profondeur)
- Nouvelle table `azurkeys_estimations` (historique serveur optionnel — mais spec dit localStorage, donc peut-être zéro table ; à trancher avec toi).
- Composants module (tous scoped `.estim-scope` pour ne pas polluer le design system) :
  - `src/pages/rapports/EstimationWizardPage.tsx` (formulaire multi-étapes)
  - `src/pages/rapports/EstimationReportPage.tsx` (rapport WYSIWYG + toolbar)
  - `src/components/estimation/wizard/*` (7 steps)
  - `src/components/estimation/report/*` (11 blocs)
  - `src/components/estimation/toolbar/*` (Simulateur, Ajuster, Pitch, Reset, Imprimer)
  - `src/components/estimation/map/PositionMap.tsx` (Leaflet + CARTO light)
  - `src/lib/estimation/engine.ts` (moteur déterministe front)
  - `src/lib/estimation/format.ts` (fix U+202F → U+00A0)
  - `src/lib/estimation/pagination.ts` (moteur DP de pagination)
  - `src/lib/estimation/history.ts` (localStorage, quota fallback)
  - `src/styles/estimation-print.css` (@page A4, break-inside, etc.)
- 2 nouvelles routes sous `/rapports/estimation/nouveau` et `/rapports/estimation/:id`, entrée dans `RapportsLayout` nav.
- Edge functions Supabase (Deno, `verify_jwt = false` par défaut, corsHeaders, zod) :
  - `estimation-calculate` (miroir back du moteur — même code partagé via copie contrôlée)
  - `estimation-extract-airdna` (parse PDF via `pdfjs` ou `unpdf` npm:)
  - `estimation-geocode` (Nominatim, User-Agent, fallbacks)
  - `estimation-market-research` (Lovable AI, `google/gemini-3-flash-preview`)
  - `estimation-recommendations` (Lovable AI, JSON structuré via Output)
  - `estimation-enhance` (copywriting)

**Contradictions à arbitrer AVANT tout code — 6 points bloquants**

1. **Charte typo** : le projet impose Cinzel/Josefin. Le prompt module impose Playfair/Cormorant/Inter. → J'applique la charte du prompt UNIQUEMENT scopée au module estimation (comme `.azurkeys-scope` l'a déjà fait avec Cormorant/Montserrat). Confirmes-tu ?
2. **Constantes moteur** : le prompt §3 déclare interdit d'inventer P50/P70/P85, poids du score, ADR par catégorie, coefficients vue/piscine, occupations saisonnières, etc. **Aucune de ces valeurs n'existe dans le projet.** Je ne peux pas coder le moteur sans que tu me fournisses le barème complet (ou m'autorises explicitement à proposer un premier jeu calibré Côte d'Azur/Saint-Raphaël à valider). Quelle option ?
3. **Historique** : localStorage (spec) ou table Supabase `azurkeys_estimations` liée au user (permet partage/relecture cross-device) ? Spec dit localStorage strict, je confirme cette option sauf avis contraire.
4. **AirDNA extraction** : parse déterministe d'un export PDF AirDNA. Peux-tu fournir un PDF exemple ? Sans échantillon réel je ne peux pas garantir l'extraction — je devrai stopper la phase 7 selon la règle anti-hallucination.
5. **Accès au module** : réservé au super_admin conciergerie uniquement, ou accessible aussi aux comptes conciergerie standard ? (Actuellement `/rapports` est ouvert à tout utilisateur connecté.)
6. **Bouton Télécharger PDF** : le prompt impose `window.print()` (pas de html2canvas). OK, je n'utilise PAS `html2pdf.js` pour ce module contrairement au reste du projet.

**Plan d'implémentation par phases** (ordre imposé §MODE D'EXÉCUTION étape 3)

| # | Phase | Livrable | Checkpoint |
|---|---|---|---|
| 1 | Structure/nav | routes `/rapports/estimation/*` + entrée nav + scope CSS + fonts | build OK, dashboards intacts |
| 2 | Formulaire 7 étapes | wizard complet, validation zod, persistance state | navigation avant/arrière |
| 3 | Moteur front déterministe | `engine.ts` + tests unitaires cas limites | plafonds testés |
| 4 | Moteur back miroir | edge `estimation-calculate` + test parité front/back | même sortie au centime |
| 5 | Rapport WYSIWYG | 11 blocs, textes exacts §5, badges calibration | conformité §4 |
| 6 | Moteur pagination PDF | DP layout + @page + couverture absolue | cas de référence = 6 pages |
| 7 | Import AirDNA | edge extract-airdna + UI upload | extraction réelle sur PDF fourni |
| 8 | Géocodage | edge geocode Nominatim | coords réelles, pas de fake |
| 9 | Marché IA | edge market-research | fusion 60/40 |
| 10 | Recommandations IA | edge recommendations | section masquée si `ok:false` |
| 11 | Simulateur | sliders + recalc live | |
| 12 | Ajuster | édition prix/nuits inline + recalc proportionnel | plafonds respectés |
| 13 | Pitch 1 page | export A4 unique | |
| 14 | Historique localStorage | 10 entrées, fallback 5, photos exclues | |
| 15 | Tests Chrome + Safari | validation visuelle page par page du cas de référence | 6 pages exactes |

---

## Ce que j'attends de toi pour débloquer la phase 1

Réponds sur les **6 points d'arbitrage** ci-dessus (surtout **#2 barème moteur** et **#4 PDF AirDNA échantillon** qui sont bloquants selon la règle anti-hallucination). Dès validation, j'attaque la phase 1 (structure + nav) et je te confirme la checklist avant de passer à la 2.
