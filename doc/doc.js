/** 
Afin de simplifier l'utilisation de Cordova, un base applicative a été développée : 
[CordovApp]{@link module:CordovApp} (dans le répertoire `./js/wapp` de l'application).

Le but est de simplifier et unifier l'initialisation des applications Cordova.

## Objet CordovApp

L'objet {@link CordovApp} définit une application standard et prend en charge :
* l'initialisation de l'application
* la mise en pause ou la fermeture de l'application
* la gestion des bouton android (menu/backbutton)
* la sauvegarde des paramètres
* le chargement des pages et des templates
* ainsi que quelques fonctionnalités utiles (input clear, gestion du focus ).

La première chose à faire est donc de créer une application et surcharger les 
fonctionnalités utiles ({@link CordovApp#initialize initialize}, 
{@link CordovApp#onMenuButton onMenuButton}, {@link CordovApp#pause pause}, 
{@link CordovApp#resume resume}, {@link CordovApp#quit quit}).    
La fonction initialize est appelée lorsque le système est initialisé et l'application 
peut se lancer.
````
var wapp = new CordovApp(
{   // Initilize the application map 
    initialize: function() 
    {    // initialiser l'application
    }
});
````

## Fonctionnalités

Outre la gestion du {@link CordovApp#initialize lancement} de l'application, l'objet {@link CordovApp} permet 
également :
- {@link module:CordovApp-Pages la gestion de pages}
- {@link module:CordovApp-Dialogues la gestion de dialogues et de notifications}
- {@link module:CordovApp-Help la gestion de l'aide en ligne}
- {@link module:CordovApp-Parametres une gestion avancée des paramètres de l'application}

@module CordovApp
*/
