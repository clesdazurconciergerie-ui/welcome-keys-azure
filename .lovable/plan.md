## Objectif

Un seul système d'état des lieux (V2), remplissable en < 3 min sur téléphone, avec un PDF final envoyé automatiquement par email au propriétaire.

## 1. Nettoyage — supprimer V1

- Supprimer les routes/pages V1 : `InspectionsPage.tsx`, `InspectionsAdminPage.tsx`, `CreateInspectionDialog.tsx` (v1), `EntryValidationDialog.tsx`, `ExitCompletionDialog.tsx`, `InspectionPdfGenerator.tsx` (v1), hook `useInspections.ts`, tables résiduelles `inspections/inspection_items/inspection_photos/inspection_audit_log` (l'app utilise `property_inspections` en v2).
- Renommer les routes V2 : `/dashboard/etats-des-lieux` (au lieu de `-v2`), item sidebar unifié « États des lieux ».

## 2. UI mobile — remplissage éclair

Nouvelle page `InspectionQuickFill` (route `/dashboard/etats-des-lieux/:id/remplir`), optimisée pour le doigt :

- **En-tête sticky** : nom du bien, type (entrée/sortie), progress bar « X / Y items ».
- **Une pièce = un accordéon**, tout scroll vertical, pas d'onglets.
- **Chaque item = une grosse ligne tactile** (min-height 56 px) : nom à gauche, 3 boutons ronds à droite :
  - ✓ OK (vert) — 1 tap, item validé, on avance
  - ⚠ Défaut (orange) — ouvre inline un champ commentaire + bouton 📷
  - ✕ Cassé (rouge) — commentaire obligatoire + photo obligatoire
- **Bouton flottant 🎤 « Dicter »** en bas à droite : appui long → enregistre → transcription via `openai/gpt-4o-transcribe` (Lovable AI Gateway) → une petite IA (`google/gemini-2.5-flash`) parse la transcription en mises à jour d'items (« salon nickel, canapé taché, ampoule cassée dans la cuisine ») et applique. L'utilisateur valide/rejette les changements proposés.
- **Compteurs + notes** : 1 seule carte en bas, 3 gros champs.
- **Bouton final « Signer & clôturer »** → écran signature.

## 3. Photos ménage auto-attachées

- Nouvelle logique : quand on crée un état des lieux d'**entrée**, on récupère automatiquement les `mission_photos` de la dernière **mission de ménage terminée** sur ce logement (postérieure au dernier check-out).
- Elles apparaissent en lecture seule dans la section « Photos initiales (ménage) », groupées par pièce d'après leur `photo_type`.
- Sur un état des lieux de **sortie**, on affiche côte à côte : photo ménage (avant séjour) ↔ photo prise pendant l'EDL sortie sur le même item, pour comparaison visuelle immédiate dans le PDF.
- L'onglet Photos manuel reste dispo pour ajouter des clichés spécifiques (défauts).

## 4. Signature tactile obligatoire

- Écran plein page mobile avec le `SignaturePad` existant, deux cadres empilés : « Concierge / Prestataire » puis « Voyageur / Propriétaire ».
- Nom obligatoire sous chaque signature, horodatage automatique.
- Bouton « Valider » désactivé tant que : au moins 1 photo (ménage compte) + les 2 signatures présentes.
- À la validation → `status = validated`, `signed_at = now()`, déclenche l'edge function d'envoi PDF.

## 5. PDF pro + envoi email

Nouvelle edge function `send-inspection-report` :

- Génère un PDF côté serveur avec un template HTML monochrome Azurkeys (Cinzel/Josefin, radius 0, shadow none) :
  - Page de garde : bien, dates séjour, type, N° référence
  - Résumé exécutif : nb items OK / défauts / cassés, dommages notables
  - Relevés compteurs
  - Section pièce par pièce avec grille photos avant/après quand dispo
  - Notes & dommages
  - Signatures + horodatage + IP
- PDF stocké dans le bucket `inspection-photos` sous `pdfs/{property_id}/{inspection_id}.pdf` (signed URL 30 j).
- Envoi via connector **Resend** (déjà branché) au(x) propriétaire(s) du bien, avec le PDF en pièce jointe + lien de téléchargement.
- Déclenchée par un trigger DB à la transition `validated`, OU appelable manuellement via bouton « Renvoyer par email ».
- Ajoute `report_pdf_url`, `report_sent_at`, `report_sent_to` sur `property_inspections`.

## 6. Portail propriétaire

- `OwnerInspectionsPage` : liste simple avec badges statut, bouton « Télécharger le PDF », aperçu inline sur desktop.
- Réception email automatique dès validation, aucune action requise côté proprio.

## Technique

- Nouvelles tables : aucune. Nouvelles colonnes sur `property_inspections` : `report_pdf_url text`, `report_sent_at timestamptz`, `report_sent_to text[]`.
- Nouvelles migrations DB pour ajouter colonnes + trigger notification.
- Nouveau composant `<QuickChecklistItem>`, `<VoiceDictationButton>`, `<InspectionSignatureFlow>`.
- Nouvelle edge function `send-inspection-report` (Deno + Puppeteer-less HTML→PDF via `@react-pdf/renderer` npm ou template HTML rendu avec `html2pdf.js` côté client au fallback).
- Réutilise `openai/gpt-4o-transcribe` + `google/gemini-2.5-flash` sur Lovable AI Gateway (LOVABLE_API_KEY déjà présent).
- Suppression V1 = ~8 fichiers, remplacement route.

## Ordre d'exécution

1. Migration DB (colonnes report + trigger).
2. Edge function `send-inspection-report` + template PDF HTML.
3. `InspectionQuickFill` mobile + dictée IA.
4. Auto-import photos ménage.
5. Flow signature obligatoire.
6. Route unifiée + suppression V1.
7. Test complet mobile + envoi email.

Ça donnera ~1500 lignes de code + 1 edge function + 1 migration. Prêt à lancer si tu valides.
