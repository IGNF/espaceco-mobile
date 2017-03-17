	 __  __                      _    _        _   
	|  \/  |___ _ _    __ _ _  _(_)__| |_  ___| |_ 
	| |\/| / _ \ ' \  / _` | || | / _| ' \/ -_)  _|
	|_|  |_\___/_||_| \__, |\_,_|_\__|_||_\___|\__|
	                  |___/                        
	                  Application mobile pour les guichets


# Installation
===============

Le projet est un projet Cordova et nécessite l'installation de 
[Cordova](https://cordova.apache.org/docs/en/latest/guide/platforms/index.html) 
sur la machine.

*Nous ne décrirons pas ici l'installation de Cordova mais seulement 
la création du projet au travers l'interface en ligne de commande.  
Pour plus d'information, voir la documentation sur 
[l'interface en ligne de commande](https://cordova.apache.org/docs/en/latest/guide/cli/index.html).*

*Nous ne décrirons pas ici le contenu de l'application. Pour plus d'information, voir la 
documentation sur (http://sd-redmine.ign.fr/projects/guichet_mobile/wiki).

Sur le réseau IGN, il est nécessaire de passer par le proxy (installation des plugins, chargement de ressources).
Dans la ligne de commande, tapez :
```
> set HTTP_PROXY=http://proxy.ign.fr:3128
```

### Création de l'application
-----------------------------

La première étape est de créer un projet cordova pour recevoir l'application.   
Pour cela, rendez-vous dans le répertoire de vos projet et lancez la ligne de commande suivante :
```
> cordova create guichet-mobile fr.ign.guichet guichet
```
Placez-vous dans le répertoire de l'application et ajoutez les plateformes :
```
> cd guichet-mobile
> cordova platform add android
```

### Récupération du projet sur gitlab
-------------------------------------
Dans le répertoire de l'application (`guichet-mobile`) supprimer le répertoire `www` créé par défaut.  
Faite une extraction du git dans le répertoire de l'application afin de récupérer le 
répertoire `www` et le fichier `config.xml` de l'application.  
Au final, le répertoire doit contenir les dossiers suivant 
(`hooks`, `platforms` et `plugins` sont générés automatiquement et ne sont pas intégrés au git) :
```
guichet-mobile 
    ├[+].git
    ├[+].idea
    ├[+]hooks
    ├[+]platforms
    ├[+]plugins
    ├[+]www
    ├── config.xml
    └── readme.md
```

### Installation des plugins
-----------------------------

Afin de fonctionner l'application doit avoir accès :
- aux fichiers : pour sauvegarder les fichiers de points dans le cache,
- au tranfert de fichier : pour charger les fichiers de points depuis le serveur de la géodésie,
- aux notifications : pour l'affichage de certains dialogues,
- à la caméra : pour prendre des photos,
- au GPS : pour le positionnement.

Ceci nécessite d'ajouter les plugins suivant au projet :

```
> cordova plugin add cordova-plugin-file
> cordova plugin add cordova-plugin-file-transfer
> cordova plugin add cordova-plugin-dialogs
> cordova plugin add cordova-plugin-camera
> cordova plugin add cordova-plugin-geolocation
> cordova plugin add cordova-plugin-inappbrowser
```

Plutôt que d'ajouter les plugins un par un, vous pouvez lancer la commande :

```
> cordova prepare
```

### Compilation et installation
--------------------------------

Utilisez la commande suivante pour compiler l'application :
```
> cordova build
```
Utilisez la commande suivante pour lancer l'application :
```
> cordova run
```

### User-Agent / FileTransfert
--------------
FileTransfert.java ligne 867
```
// Add User-Agent
connection.setRequestProperty("User-Agent", "useragent");

connection.connect();
```


### Debugging
--------------

Pour déboguer une webview dans chrome : chrome://inspect/#devices

NB: ne visualise pas pour les canvas (donc OL3)


## Publication
--------------

Compiler l'APK en mode release en utilisant le keystore :
> cordova build android --buildConfig=build.json --release

> https://play.google.com/apps/publish