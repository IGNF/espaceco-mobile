/**
Fichier: `./js/wapp/cordovapp.dialog.js`

## Gestion des dialogues

L'objet CordovApp contient par défaut la possibilité d'afficher des dialogue dans 
l'application, notification et alertes.

### Affichage d'un dialogue

La {@link CordovApp} a un objet {@link CordovApp#dialog} qui lui permet 
d'afficher un dialogue en lui fournissant le contenu du dialogue à afficher 
et des paramètres pour le personnaliser, à l'aide de la fontion {@link Dialog.show}.
Le paramètre `callback` permet en particulier de récupérer les informations
à la fermeture du dialogue.

````
var wapp = new CordovApp();
wapp.dialog.show ( content, 
{    title: "Mon dialogue", 
    className: "maclasse", 
    closeBox: true,
    buttons: { cancel:"Annuler", ok: ""},
    callback: function(bt)
    {    if (bt == "ok")
        {    ...
        }
    }
});
````

Le contenu peut être chargé via un template :
````
var wapp = new CordovApp();
var content= CordovApp.template('dialog-mondialogue');
wapp.dialog.show ( content );
````

Le contenu peut être soit soit une chaine (contenant un code HTML valide) soit un objet 
jQuery. Dans ce cas, il est possible de connecter le contenu avant l'insertion dans 
le dialogue au travers des écouteurs jQuery.

Les dialogues sont modaux et une div vient bloquer les interactions avec le fond. 
On ne peut afficher qu'un seul dialogue à la fois.    
Il est possible de savoir si un dialogue est ouvert ({@link Dialog.isOpen}) 
et on peut le fermer via la méthode {@link Dialog.close}.
Si on ne fourni aucun argument à la fonction {@link Dialog.show}, 
le dernier dialogue est affiché.

````
var wapp = new CordovApp();
// Afficher un dialogue
wapp.dialog.show("test");
// Verifier s'il est ouvert
wapp.dialog.isOpen();
// Le fermer
wapp.dialog.close();
````

L'application elle même peut savoir si un dialogue est ouvert ou fermer le dialogue 
courant (cette fonction gère également les dialogues spéciaux voir § suivant).

````
var wapp = new CordovApp();
// Afficher un dialogue
wapp.dialog.show("test");
// Verifier si un dialogue est ouvert
var b = wapp.hasDialog();
// Le fermer
wapp.closeDialog();
````

### Dialogues spéciaux

Un certain nombre de dialogues spécifique sont disponible dans l'application. 
Ceux-ci vont s'afficher en superposition du dialogue standard.

Les méthodes {@link CordovApp#alert alert}, {@link CordovApp#message message} et 
{@link CordovApp#prompt prompt} de l'application permettent d'afficher 
facilement une alerte, un message ou un prompt. Le paramètre callback permet de 
récupérer l'information demandée, dans le cas d'un message, on récupère le bouton 
comme pour un dialogue standard et dans le cas du prompt, on récupère l'information 
demandée.

#### alert
````
var wapp = new CordovApp();
// Afficher une alerte
wapp.alert("Une erreur s'est produite...");
````

#### prompt
````
var wapp = new CordovApp();
// Demander une valeur
wapp.prompt("Entrez une valeur", 1, function(v){ console.log("La valeur est : "+v); });
````

#### message
````
var wapp = new CordovApp();
// Afficher un message
wapp.message("Ceci est un message informatif...", "Message", { ok:"Compris", cancel:"Annuler" }, function(b){ console.log(b); } );
````

#### selection

La méthode {@link CordovApp#selectDialog selectDialog} affiche un dialogue pour la saisie d'une valeur dans une liste.

````
var wapp = new CordovApp();
// Demander une valeur dans une liste
wapp.selectDialog ({
        i1:"Première valeur", 
        i2:"Seconde valeur"
    }, 
    "i2", 
    function(v){ 
        console.log("La valeur est : "+v); 
    }, 
    { 
        title:"Choissisez une valeur..."
    });
````

### Affiche une patience

La méthode {@link CordovApp#wait wait()} permet d'afficher un message d'attente. 
Pour fermer la patience, il faut envoyer false comme argument.

````
var wapp = new CordovApp();
// Attendre...
wapp.wait("Merci de patienter...");
````

### Les notifications

Il est également possible d'afficher des messages non bloquants via 
des {@link CordovApp#notification notifications}.    
Il faut préciser le message à afficher ainsi que la durée d'affiche sous la 
forme d'une nombre de milliseconde ou une chaine indiquant une valeur en seconde.

````
var wapp = new CordovApp();
// Afficher une notification
wapp.notification ('<i style="color:yellow">Hello !</i>', "2s");
````

@module CordovApp-Dialogues
*/