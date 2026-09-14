## Objectif

Corriger définitivement le chevauchement des lignes dans le PDF de l’estimation locative, sans modifier les calculs ni le contenu du rapport.

## Correctif

- Supprimer la compression visuelle par `transform: scale(...)`, qui est instable lors de la conversion en image et peut superposer les lignes.
- Remplacer cette compression par des niveaux de densité A4 déterministes qui réduisent réellement typographies, espacements et blocs avant la capture.
- Attendre explicitement le chargement des polices et des images avant chaque export.
- Exporter depuis une copie A4 isolée, à taille native, sans zoom d’aperçu ni décorations d’écran.
- Ajouter des garde-fous pour refuser l’export si une page dépasse encore sa hauteur disponible.

## Vérification

- Générer un rapport complet puis contrôler visuellement chaque page rendue.
- Vérifier l’absence de chevauchement, de texte coupé, de page blanche et de changement de pagination.
- Contrôler aussi l’aperçu à l’écran et les erreurs de compilation.
