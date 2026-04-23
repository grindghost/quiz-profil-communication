# Quiz de style de communication

Ce projet permet de faire passer un questionnaire sur les styles de communication et d'obtenir un résultat visuel à la fin.
Il inclut aussi un petit outil d'édition pour mettre à jour facilement les questions sans modifier le code.

Ce projet contient deux parties :

- `quiz/` : le questionnaire que les participants remplissent
- `builder/` : un outil simple pour modifier les questions et les choix

## Stack technique

Le projet utilise une stack web simple, sans framework lourd :

- HTML/CSS/JavaScript : base de l'interface et de la logique
- Reveal.js : navigation du questionnaire sous forme de slides
- Chart.js : affichage du graphique de résultats (camembert)
- JSON : stockage des questions, choix et styles de réponse

Le builder fonctionne aussi en HTML/CSS/JavaScript pur, avec :

- validation simple de la structure JSON
- export du fichier `data.json`
- thème clair/sombre (préférence sauvegardée localement)

## Structure du projet

- `quiz/index.html` : point d'entrée du quiz
- `quiz/assets/` : fichiers du quiz (questions JSON, styles, scripts, Reveal.js)
- `builder/index.html` : point d'entrée du builder
- `builder/assets/` : fichiers du builder (script, style, JSON de travail)

## Utiliser le quiz

1. Ouvrir `quiz/index.html` dans un navigateur.
2. Répondre aux questions.
3. Voir le résultat final avec le graphique.

## Utiliser le builder (modifier les questions)

1. Ouvrir `builder/index.html` dans un navigateur.
2. Cliquer sur **Charger assets/data.json** pour charger les questions actuelles.
3. Modifier les textes, ajouter/supprimer des questions, déplacer les choix.
4. Cliquer sur **Télécharger data.json** pour exporter le nouveau fichier.

Le builder valide la structure JSON au chargement et à l'import.  
Si le format est invalide, un message d'erreur s'affiche.

## Mettre à jour le quiz avec le nouveau JSON

Après export depuis le builder :

1. Prendre le `data.json` téléchargé.
2. Remplacer le fichier `quiz/assets/data.json` par ce nouveau fichier.
3. Recharger `quiz/index.html` dans le navigateur.

## Thème sombre du builder

Le builder propose un bouton de thème clair/sombre.  
Le choix est mémorisé automatiquement pour les prochaines ouvertures.
