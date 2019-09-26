# Guichet mobile

Application mobile pour les guichets

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
Faites une extraction du git dans le répertoire de l'application afin de récupérer les fichiers de l'application.     
Installer les ressources nécessaire au développement.
````powershell
$ npm install
````

Au final, le répertoire doit contenir les dossiers suivant (hooks, platforms et plugins sont générés automatiquement et ne sont pas intégrés au git) :
````
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
├──android-keystore.jks
├──build.json
├──config.xml
├──package.json
└──readme.md
````

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
cordova plugin add cordova-plugin-file-transfer --save
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
Le projet utilise ParcelJS pour l'empaquetage des fichiers dans le répertoire `./www`.

Lors du lancement des commande cordova build ou run, le répertoire `www` est recréé avec le nouveau code.   
Le contenu du répertoire `./src/assets` est recopié dans le répertore  `./www` à chaque empaquetage. 
En cas de supression de fichier dans ce répertoire, il est nécessaire de détruire le répertoire `www` afin de nettoyer son contenu.


## Dépendances

Le projet dépend de la bibliothèque [Cordovapp](http://gitlab.dockerforge.ign.fr/express/cordovapp) qui mutualise le code de l'application et l'accès à [l'espace collaboratif](https://espacecollaboratif.ign.fr/).
La documentation de la librairie est disponible sur le [wiki du Gitlab](http://gitlab.dockerforge.ign.fr/express/cordovapp/wikis/home).

La bibliothèque est installée avec les dépendance du projet lors de la commande `npm install`.
Vous pouvez également cloner le dépôt dans le répertoire `node_modules` pour avoir accès au code et le mettre à jour.
**Attention** : le code est mutualisé entre plusieurs applications, veillez donc à vérifier que les modifications n'auront pas d'impacte sur les autres développements (ou utiliser une branche de développement).

## Développement et debugage

### Page web et live reload

Pour démarrer un serveur pour tester l'application en local, lancer la ligne de commande:
````powershell
$ npm start
````
Aller sur la page http://localhost:1234 pour voir l'application.

NB: les commande cordova (accès aux plugins, aux photos, etc.) ne sont pas accessible dans ce mode.

### Compilation et installation

Utilisez la commande suivante pour compiler l'application :
````
$ cordova build
````
L'empaquetage se fait sans les sourcemaps et en minifiant le code. Si vous ne voulez pas minifier le code (mode debug), ajoutez `--dev` :
````
$ cordova build --dev
````

Utilisez la commande suivante pour lancer l'application sur un smartphone (avec `--dev` pour ne pas minifier):

````
$ cordova run
````

NB: bien que non minifié le code reste empaqueté (les fichiers sourcemap ne sont pas accessible sur le smartphone).


### Debugging

Pour déboguer une webview dans chrome rendez-vous sur : chrome://inspect/

NB: le contenu des canvas (donc des cartes Openlayers) n'est pas visible dans ce mode.


## Publication

### Playstore Android

Compiler l'APK en mode release en utilisant le keystore :

````
cordova build android --buildConfig=build.json --release
````
La publication se fait sur la [console du playstore](https://play.google.com/apps/publish)

### App Store

NB: fr.ign.guichet ayant été refusé par Apple l'ID de l'application iOS est : fr.ign.collaboratif

La publication se fait sur la [iTunes connect](https://itunesconnect.apple.com/).
Il est nécessaire d'avoirun [compte développeur](https://developer.apple.com/account/) associé au compte IGN - Institut national de l'information géographique et forestière.

NB: A l'installation du plugin camera, il faut ajouter les variables nécessaires.
````
cordova plugin add cordova-plugin-camera --variable CAMERA_USAGE_DESCRIPTION="pour illustrez vos contributions" --variable PHOTOLIBRARY_USAGE_DESCRIPTION="pour illustrez vos contributions"
````
