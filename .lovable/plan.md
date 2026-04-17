

The user wants a complete inventory/summary of all features of the MyWelkom platform that they can paste into an AI as "site memory". This is a documentation task, not an implementation task. I have extensive context from the memory index already showing all major features.

I'll generate a comprehensive markdown document covering:
- Brand & positioning
- Tech stack
- User roles
- All modules (Concierge, Owner, Provider, Demo)
- Key business logic
- Integrations

Since this is a documentation/artifact task, I'll generate a downloadable markdown file in /mnt/documents/ once approved.

## Plan: Complete MyWelkom feature inventory document

### Deliverable
A single comprehensive Markdown file (`mywelkom-memoire-complete.md`) ready to paste into any AI as project memory. Structured for maximum AI comprehension: short sections, bullet points, no fluff.

### Document structure

1. **Identité & Positionnement** — Welkom by Azur Keys, palette (#061452 / #C4A45B), cible conciergeries premium
2. **Stack technique** — Vite + React + TS, Tailwind, Supabase (Cloud), Stripe, Lovable AI Gateway, OpenAI
3. **Authentification & Rôles** — /auth unifié, redirection dynamique (concierge / proprietaire / prestataire), trial 30j, demo 7j
4. **Plans & Tarifs** — Starter (5 livrets), Business (50), Premium, limites DB-enforced, Stripe Payment Links
5. **Module Concierge — Pilotage**
   - Dashboard (KPIs, calendrier global tri-couleur, opérations à venir)
   - Performance (occupation, revenus, IA Gemini recommandations)
   - Notifications (Resend + realtime)
6. **Module Concierge — Logements**
   - Properties-first architecture
   - Onglets: Photos / Documents / Contrat / Tarifs / Ménage / iCal
   - Import Airbnb auto, iCal sync normalisé, calendrier hybride
7. **Module Concierge — Livrets**
   - Wizard 10 étapes, sections (Identité, Pratique, WiFi, Équipements, Ménage, Alentours, Contacts, FAQ, Légal, Bonus)
   - Thème personnalisable, lien public /view/{PIN}, chatbot intégré, bibliothèque de lieux réutilisables
8. **Module Concierge — Opérations**
   - Missions (workflow v3: assignation directe + missions ouvertes, claim atomique)
   - Photo Guide obligatoire par catégorie
   - Checklists optionnelles
   - États des lieux (entrée/sortie, signatures, PDF, photos)
   - Automatisation ménage (trigger DB sur checkout)
9. **Module Concierge — Finance**
   - Factures (HTML→PDF, 293B CGI, branding custom)
   - Dépenses unifiées (manuelles + payouts missions)
   - Encaissements cash
   - KPIs: Revenu brut, Dépenses, Net, Marge
10. **Module Concierge — CRM Prospection**
    - Kanban 9 étapes, scoring auto, séquences emails 6 étapes
11. **Module Concierge — Outils**
    - Photo Optimizer (pipeline Mertens fusion + post-process real estate)
    - AI Call Prompter (Gemini 2.5 Flash, push-to-talk)
    - Paramètres automatisation
12. **Portail Propriétaire** — Read-only mobile-first: dashboard, calendrier (avec masquage overrides), biens, livrets, finances (factures only, zéro KPI brut), photos ménage, états des lieux, demandes catégorisées, documents (URLs signées 5min)
13. **Portail Prestataire** — Missions ouvertes, planning, interventions, paiements, conflits détectés, historique, support
14. **Demo publique /demo** — Dashboard interactif mocké via DemoContext, expiration 7j
15. **Sécurité** — RLS RESTRICTIVE stricte, user_id explicite, search_path=public, SECURITY DEFINER pour cross-table, séparation roles dans table dédiée
16. **Intégrations** — Supabase (Auth/DB/Storage/Realtime/Edge Functions), Stripe (webhooks → roles sync), Resend (notifications@mywelkom.com), Lovable AI Gateway (Gemini), OpenAI (photo)
17. **SEO & Landing** — Modal segmentation entrée, Schema.org LocalBusiness, mots-clés français conciergerie

### Output
- File: `/mnt/documents/mywelkom-memoire-complete.md`
- Format: Markdown propre, ~6-10K mots, structuré pour copier-coller dans ChatGPT/Claude/Gemini
- `<lov-artifact>` tag pour téléchargement

