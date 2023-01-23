# Guichet mobile

Application mobile pour les guichets

[![](https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Google_Play_Store_badge_FR.svg/100px-Google_Play_Store_badge_FR.svg.png)](https://play.google.com/store/apps/details?id=fr.ign.guichet&hl=fr)
[![](https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Available_on_the_App_Store_%28black%29_SVG.svg/100px-Available_on_the_App_Store_%28black%29_SVG.svg.png)](https://itunes.apple.com/us/app/espace-collaboratif-ign/id1245621439?l=fr)

* [Redmine du projet](http://sd-redmine.ign.fr/projects/guichet_mobile/wiki)

## Principe

Le projet est un projet [Cordova](https://cordova.apache.org/) qui utilise [Parcel](https://parceljs.org/) pour la génération du code.

* Nous ne décrirons pas ici l'installation et l'utilisation de ParcelJS,
pour plus d'information, rendez-vous sur le site du [bundler](https://parceljs.org/).    
Le projet utilise les hook `before_build` et `before_run` pour lancer l'empaquetage avant le build ou le run (`config.xml`).

* Nous ne décrirons pas ici l'installation de Cordova mais seulement 
la création du projet au travers l'interface en ligne de commande.  
Pour plus d'information, voir la documentation sur 
[l'interface en ligne de commande](https://cordova.apache.org/docs/en/latest/guide/cli/index.html).

* Nous ne décrirons pas ici le contenu de l'application. Pour plus d'information, voir la 
documentation sur (http://sd-redmine.ign.fr/projects/guichet_mobile/wiki).

Sur le réseau IGN, il est nécessaire de passer par le proxy (installation des plugins, chargement de ressources).
Dans la ligne de commande, tapez :
```
$ set HTTP_PROXY=http://proxy.ign.fr:3128
```
Il est également nécessaire de configurer le proxy pour npm.


## Installation

### Création de l'application

La première étape est de créer un projet cordova pour recevoir l'application.    
Pour cela, rendez-vous dans le répertoire de vos projet et lancez la ligne de commande suivante :

````powershell
$ cordova create guichet-mobile fr.ign.guichet guichet-mobile
````

### Récupération du projet sur gitlab

Dans le répertoire de l'application (`guichet-mobile`) supprimer le répertoire `www` et le fichier `config.xml` créés par défaut.    
Faites une extraction du git dans le répertoire de l'application afin de récupérer les fichiers de l'application (extraire les fichiers du git et les copier dans le répertoire.     
Installer les ressources nécessaire au développement.
````powershell
$ npm install
````

Au final, le répertoire doit contenir les dossiers suivant (hooks, platforms et plugins sont générés automatiquement et ne sont pas intégrés au git) :
````none
├[+].git
├─[+] hooks
├─[+] node_modules
├─[+] platforms
├─[+] plugins
├─[+] res
├─[+] scripts
|  └──parcel.js
├─[+] src
├─[+] www
├──.env.dist
├──android-keystore.jks
├──build.json
├──config.xml
├──package.json
└──readme.md
````

Dupliquer le fichier `.env.dist` et renommer le `.env` et remplissez les variables d'environnement utilisé par le projet.

### Installation des plugins
Afin de fonctionner l'application doit avoir accès :

* aux fichiers : pour sauvegarder les fichiers du cache,
* au tranfert de fichier : pour l'échange de fichiers avec l'espace collaboratif,
* aux notifications : pour l'affichage de certains dialogues,
* à la caméra : pour prendre des photos,
* au GPS : pour le positionnement.
* aux informations de connexion (réseau)

Ceci nécessite d'ajouter les plugins suivant au projet :

````powershell
cordova plugin add cordova-plugin-file --save
cordova plugin add cordova-plugin-dialogs --save
cordova plugin add cordova-plugin-camera --save
cordova plugin add cordova-plugin-geolocation --save
cordova plugin add cordova-plugin-inappbrowser --save
cordova plugin add cordova-plugin-network-information --save
````
Plutôt que d'ajouter les plugins un par un, vous pouvez lancer la commande :
````powershell
$ cordova prepare
````

Il est ensuite nécessaire d'installer la platforme utilisée pour le développement, soit pour android :
````powershell
$ cordova platform add android
````

## Organisation du code

L'ensemble des fichiers de l'application est situé dans le répertoire `./src` du projet.    
Le projet utilise ParcelJS pour l'empaquetage des fichiers. Le programme sera installé dans le répertoire `./www` de Cordova.

Lors du lancement des commande cordova build ou run, le répertoire `./www` est recréé avec le nouveau code.   
Le contenu du répertoire `./src/assets` est recopié dans le répertore  `./www` à chaque empaquetage.    
En cas de supression de fichier dans ce répertoire, il est nécessaire de détruire le répertoire `./www` afin de nettoyer son contenu.


## Dépendances

Le projet dépend de la bibliothèque [Cordovapp](http://gitlab.dockerforge.ign.fr/express/cordovapp) qui mutualise le code de l'application et l'accès à [l'espace collaboratif](https://espacecollaboratif.ign.fr/).
La documentation de la librairie est disponible sur le [wiki du Gitlab](http://gitlab.dockerforge.ign.fr/express/cordovapp/wikis/home).

La bibliothèque est installée avec les dépendance du projet lors de la commande `npm install`.
Vous pouvez également cloner le dépôt dans le répertoire `node_modules` pour avoir accès au code et le mettre à jour.

**Attention** : le code est mutualisé entre plusieurs applications, veillez donc à vérifier que les modifications n'auront pas d'impacte sur les autres développements (ou utiliser une branche de développement).

## Développement et debugage

### Page web et live reload

Pour démarrer un serveur et tester l'application en local, lancer la ligne de commande:
````powershell
$ npm start
````
Aller sur la page http://localhost:1234 pour voir l'application.

NB: les plugins Cordova (accès aux fichiers, aux photos, etc.) ne sont pas accessible dans ce mode.

### Compilation et installation

Utilisez la commande suivante pour compiler l'application :
````
$ npx cordova build
````
L'empaquetage se fait sans les sourcemaps et en minifiant le code. Si vous ne voulez pas minifier le code (mode **debug**), ajoutez `--dev` :
````
$ npx cordova build --dev
````

Utilisez la commande suivante pour lancer l'application sur un smartphone (avec `--dev` pour ne pas minifier):

````
$ npx cordova run
````

NB: bien que non minifié le code reste empaqueté (les fichiers sourcemap ne sont pas accessible sur le mobile).


### Debugging

Pour déboguer une webview dans chrome rendez-vous sur : [chrome://inspect/](chrome://inspect/)

NB: le contenu des canvas (donc des cartes Openlayers) n'est pas visible sur la console du debuggeur.

## Développement d'une application spécifique

Il est possible de développer une application spécifique.
Pour cela, vous devez modifier le fichier `.env` pour indiquer les informations sur l'application a générer (en utilisant le fichier `.env.dist` comme exemple) : 
```
APPLI=Répertoire de l'application (EspaceCo)
APPLI_ID=identifiant de l'application sur les stores (fr.ign.guichet)
APPLI_NAME=Nom de l'application (Espace collaboratif IGN)
```

L'identifiant et le nom de l'application seront mis à jour dans le fichier confg.xml de Cordova.
Les fichiers dans le répertoire de l'application seront copié dans le répertoire `./src/appli` du projet

Les fichiers spécifiques sont à placer dans le répertoire `./scripts/APPLI` du projet (`APPLI` étant le nom donné dans le fichier `.env`)
Les fichiers du répertoire `./scripts/APPLI` sont recopiés dans le répertoire `./appli` du projet.
/!\ les fichiers existant sont supprimés et remplacé à chaque build par ceux contenus dans le répertoire `./scripts/APPLI` !

Lancez le script `backup` pour assurer la sauvegarde des modifications automatiques du répertoire `./src/appli` dans le répertoire d'origine `./scripts/APPLI`.
```
$ npm run backup
```

## Geolocalisation Bluetooth

Ajouter les permissions au fichier `plugin.xml` du plugin bluetooth-serial ???
```xml
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

## Publication

### Playstore Android

Compiler l'APK en mode release en utilisant le keystore disponible avec le projet :
````
npx cordova build android --buildConfig=build.json --apk
````
Le fichier `build.json` demande un mot de passe. Vous trouverez celui-ci dans le projet [android-keystore](http://gitlab.dockerforge.ign.fr/jmviglino/android-keystore).    
L'apk résultante est disponible dans le répertoire `./platforms/android/app/build/outputs/apk/release/` de l'application.
Vous pouvez transmettre l'APK pour installation sur vos machines.

Pour créer un fichier .aab pour diffusion sur les store, la commande est :
```javascript
npx cordova build android --buildConfig=build.json --release
```
La publication se fait sur la [console du playstore](https://play.google.com/apps/publish)

### App Store

NB: fr.ign.guichet ayant été refusé par Apple l'ID de l'application iOS est : `fr.ign.collaboratif`

La publication se fait sur la [AppleStore connect](https://appstoreconnect.apple.com/apps).
Il est nécessaire d'avoir un [compte développeur](https://developer.apple.com/account/) associé au compte IGN - Institut national de l'information géographique et forestière.

NB: A l'installation du plugin camera, il faut ajouter les variables nécessaires pour éviter un retour négatif d'iTunes.
````
cordova plugin add cordova-plugin-camera --variable CAMERA_USAGE_DESCRIPTION="pour illustrez vos contributions" --variable PHOTOLIBRARY_USAGE_DESCRIPTION="pour illustrez vos contributions"
````
