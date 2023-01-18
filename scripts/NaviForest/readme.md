# Application Espace co spécifique

## Créer une application spécifique

Modifier le fichier `.env` pour indiquer les informations sur l'application a générer (en utilisant le fichier `.env.dist` comme exemple) : 
```
APPLI=Répertoire de l'application (EspaceCo)
APPLI_ID=identifiant de l'application sur les stores (fr.ign.guichet)
APPLI_NAME=Nom de l'application (Espace collaboratif IGN)
```

L'identifiant et le nom de l'application seront mis à jour dans le fichier confg.xml de Cordova.
Les fichiers dans le répertoire de l'application seront copié dans le répertoire `./appli` du projet

## Fichiers spécifiques

Les fichiers spécifiques sont à placer dans le répertoire `./scripts/APPLI` du projet (`APPLI` étant le nom donné dans le fichier `.env`)

Les fichiers du répertoire `./scripts/APPLI` sont recopiés dans le répertoire `./appli` du projet.
/!\ les fichiers existant sont supprimés et remplacé à chaque build par ceux contenus dans le répertoire `./scripts/APPLI` !

Le fichier `./scripts/APPLI/appli.js` est inclus et exécuté au lancement de l'application.
Le fichier `./scripts/APPLI/logo.png` est utilisé comme logo de l'application (recopié dans le répertoire `./assets/img`).

## Developpement

Avant chaque construction de l'application (start, build) le répertoire spécifique de l'application sont recopié dans le  repertoire `./src/appli`.
Si vous modifiez un fichier dans ce répertoire il faut s'assurer de le recopier dans le répertoire d'origine (au risque de le voir écrasé lors de la prochaine construction).
Vous pouvez lancer le script `backup` pour assurer la sauvegarde des modifications automatiques.
```
$ npm run backup
```