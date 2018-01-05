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

/**
Fichier: `./js/wapp/cordovapp.page.js`

## Gestion des pages et templates

### Définition

La gestion des pages et des templates est faite dans le fichier 
`./js/wapp/cordovapp.page.js`.    
Il gère l'affichage des pages et du menu.

La navigation dans l'application web se fait via des pages qui s'affichent au dessus 
de la carte. Généralement, une seule page est active en même, bien qu'il soit possible 
d'afficher plusieurs pages en même temps.

Les pages sont définies via des blocs avec un role 'page' dans la page de l'application 
(HMTL). L'identifiant de la div permet de gérer la page (affichage, fermeture, etc.).

````html
<!-- A propos -->
<div id="apropos" data-role="page">...</div>
<!-- Options -->
<div id="options" data-role="page">...</div>
````

L'affichage d'une page implique :
- la fermeture des autres pages / menu
- l'affichage de la page (ajout d'une classe visible + affichage de la div de la page)
- l'ajout d'un attribut data-page de valeur l'identifiant de la page sur le body 
(afin de gérer l'affichage des autres éléments de l'application)
- l'envoie d'un évènement 'showpage' avec l'information de la page affichée

La fermeture d'une page implique :
- le masquage de la page (suppression de la classe visible + masquage de la div de la page)
- la suppression de l'attribut data-page sur le body
- l'envoie d'un évènement 'hidepage' avec l'information de la page fermée

L'ajout/suppression de la classe visible à la page permet l'animation de la page via 
le CSS. S'il existe une animation standard, celle-ci reste surchargeable directement 
dans le CSS. Dans ce cas, le css donne la position de départ et la position d'arrivée 
correspond à la définition CSS avec la classe `visible`.    
Par défaut, la page s'affiche via un glissé depuis la droite sur le fond. 
`data-direction` permet de préciser la direction du glissé (up ou left).

L'objet application a les méthodes pour les afficher/masquer ({@link CordovApp#showPage}, 
{@link CordovApp#hidePage}, {@link CordovApp#togglePage}) ou connaitre la page active 
({@link CordovApp#getPage}).

## Définition des templates

Afin de mieux séparer les pages dans le fichier principal de l'application (index.html), 
il est possible de les placer dans des templates en leur associant une donnée template. 
Les templates sont des fichiers html spérarés qui seront chargés et intégrés dans la page 
au lancement de l'application.

````html
<!-- A propos -->
<div id="apropos" data-role="page" data-template="apropos"></div>
<!-- Options -->
<div id="options" data-role="page" data-template="options"></div>
````

Les templates des pages sont dans le dossier /templates de l'application avec le nom 
page-nom.html où nom est le nom spécifié dans le fichier origine 
(`templates/page-apropos.html` pour la page a propose dans l'exemple ci-dessus).
Les templates peuvent eux-même contenir des référence à des templates.

Les templates peuvent être chargés indépendamment en utilisant la méthode static 
{@link CordovApp.template}. Par défaut, si aucun répertoire n'est précisé, 
le template charge le fichier dans le répertoire /templates de l'application. 
On peut changer ce comportement en précisant un répertoire.

````
// Charger le fichier templates/exemple.html de l'application
var temp1 = CordovApp.template('exemple');
// Charger le fichier dossier/exemple.html de l'application
var temp2 = CordovApp.template('dossier/exemple');
````

## Structure d'une page

Il n'y a pas de structure imposée pour une page mais une structure générique est proposée 
pour les pages les plus courantes, comprenant un haut de page et un contenu.    
Le haut de page est définit par un role header avec une option back-button permettant 
d'ajouter une flèche de retour.Le contenu est défini par un role content. 
Un clic sur la flèche de retour exécutera la fonction pageBack de l'application 
(par défaut, cela fermera la page).

````html
<div data-role="header" data-back-button="true">Ma page</div>
<div data-role="content">
    Mon contenu...
</div>
````

Pour les pages plus élaborées il est possible d'afficher des onglets via un role onglet. 
Dans ce cas, la page est composée d'un bloc de boutons (`data-role="onglet-bt"`) qui 
contrôle l'affichage des onglets de la page et d'une liste d'onglets 
(`data-role="onglet-li"`). La correspondance entre le bouton et son onglet est donnée 
par l'attribut data-list. Les onglets peuvent être défini dans la page elle même ou 
via un template.

````html
<div data-role="header" data-back-button="true">Mon titre</div>
<div data-role="onglet">
    <div data-role="onglet-bt">
        <div data-list="onglet1">
            <i class="fa fa-map-marker"></i>Premier
        </div><div data-list="onglet2">
            <i class="fa tools-layers"></i>Second
        </div>
    </div>
    <!-- Premier onglet -->
    <div data-role="onglet-li" data-list="onglet1">
        ...
    </div>
    <!-- Second onglet lu dans un template -->
    <div data-role="onglet-li" data-list="onglet2" data-template="onglet-onglet2">
    </div>
</div>
````
Les onglets sont gérés comme les page et l'objet application a les méthodes pour 
les afficher ({@link CordovApp#showonglet}), les rendre actif ({@link CordovApp#enableOnglet}) 
ou vérifier celui qui est affiché ({@link CordovApp#isOnglet}).

## Affichage des pages

Pour afficher une page il suffit d'appeler la fonction showPage avec l'identifiant de 
la page à afficher. Utiliser hidePage pour la masquer.

````
var wapp = new CordovApp();
// Afficher la page "search" 
wapp.showPage("search");
// Récuperer la page courante (renvoie "search")
var p = wapp.getPage();
// Masquer la page courante
wapp.hidePage();
// Afficher 2 pages en meme temps
wapp.showPage(['page1','page2']);
````

Il est possible de placer un écouteur pour réaliser une action lorsqu'une page est 
affichée ou fermée :
````
$("#search").on("showpage", function(e)
{    // Faire quelque chose lorsque la page s'affiche
}); 
$("#search").on("hidepage", function(e)
{    // Faire quelque chose lorsque la page s'affiche
}); 
````

**NB: Lorsqu'une page est affichée, l'attibut `data-page` est rempli avec l'identifiant 
de la page dans l'élément `<body>`.*


## Gestion des onglets

Les onglets s'affichent automatiquement lorsqu'ils sont sélectionnés.

Il est également possible de les afficher programmatiquement via la méthode 
{@link CordovApp#showOnglet}, {@link CordovApp#isOnglet} indique si l'onglet est 
affiché ou non.

````
var wapp = new CordovApp();
// Afficher l'onglet "search" 
wapp.showOnglet("search");
// Vérifier que l'onglet "search" est affiche
var b = wapp.isOnglet("search")
````

Il est possible de désactiver un onglet via la méthode {@link CordovApp#enableOnglet} :
````
var wapp = new CordovApp();
// Desactiver l'onglet "search" 
wapp.enableOnglet("search", false);
````

## Utilisation d'un menu

Il est possible de définir un menu à l'application.

````html
<div data-role="menu" data-template="principal"></div>
````

L'objet application a les méthodes pour l'afficher/masquer 
({@link CordovApp#showMenu}, {@link CordovApp#hideMenu}, {@link CordovApp#toggleMenu}) 
ou savoir si le menu est affiché ({@link CordovApp#isMenu}).   
L'affichage du menu est géré de manière identique à celui d'une page et un évènement 
de type `menu` est envoyé avec un attribut `show` (booléen) indiquant si le menu est 
affiché ou non.    
Si le contenu d'un menu est libre, le formatage par défaut utilise une liste (`<ul><li>`).

Utilisez les métodes {@link CordovApp#showMenu}, {@link CordovApp#hideMenu} et 
{@link CordovApp#toggleMenu} pour afficher ou masquer le menu.    
Lors de l'affichage ou du masquage du menu, un évènement `menu` est envoyé au document, 
avec un attribut `show` (true/false) indiquant l'état du menu.

@module CordovApp-Pages
*/

/**
Fichier: `./js/wapp/cordovapp.help.js`

## Aide en ligne

L'aide est une surcouche qui vient s'afficher en superposition de la page. 
L'aide ne s'affiche qu'une seule fois, il faut la réinitialiser si on veut pouvoir 
la rejouer.    
A chaque affichage de page, l'application cherche à afficher l'aide associée à cette 
page si elle existe dans le dossier `./help`. 
Cette aide est un template qui doit se trouver dans le répertoire `./help` de 
l'application avec pour nom l'identifiant de la page à afficher.

Il est possible de contrôler l'aide via l'objet {@link CordovApp#help help} de 
l'application. 
En particulier, on peut remettre l'aide à zéro (pour l'afficher une seconde fois). 
Afficher une aide spécifique, fermer l'aide courante ou passer à une étape suivante.

L'aide est contenue dans l'élément `#help` de la page.    
L'étape correspond à une classe spécifique de ce bloc (`.step_1` pour l'étape 1, 
`.step_2` pour l'étape 2, etc.). Le programmeur est responsable de la façon dont 
l'aide se positionne et de la gestion des étapes dans le css. 

Au lancement d'une aide, celle-ci passe à l'étape 1.    
Il est donc possible de faire des animations entre les étapes directement via le css.

````
var wapp = new CordovApp();
// Reinitialiser l'aide
wapp.help.reset();
// Afficher l'aide du template help/aide.html
wapp.help.show("aide");
````

@module CordovApp-Help
*/


/**
Fichier: `./js/wapp/cordovapp.param.js`

## Gestion et affichage de paramètres

L'objet CordovApp contient des fonctionnalités évoluées pour la gestion des paramètre et leur affichage.

### Gestion des paramètres de l'application

En standard, l'application gère, via le localStorage HTML5, la sauvegarde et la restauration des paramètres 
de l'application. Ceux-ci sont enregistrés dans `WebApp@param` du localStorage (via la fonctino {@link CordovApp#saveParam}) 
et sont stockées dans l'attribut param de l'application.
Les paramètres sont automatiquement chargés au lancement de l'application et disponible dans le initialize 
de l'application. Le programmeur est responsable de leur enregistrement, en particulier, il peut être utile
de les sauvegarder lorsque l'application quitte ou se met en pause (dans la méthode {@link CordovApp#onQuit}
ou {@link CordovApp#onPause}).

````
var wapp = new CordovApp();
// Modifier un parametre
wapp.param.mon_option = 1;
// Sauvegarder la modification pour la prochaine fois
wapp.saveParam();
````

### Lier un objet à un formulaire

Il est possible de lier une liste de valeur à un formulaire via la méthode {@link CordovApp#setParamInput} 
de l'application. L'application va alors associer les blocs data-input correspondant au aux lignes de l'objet 
fourni afin de les afficher et de gérer leur modification.

````
var wapp = new CordovApp();
var p = { name:"sans nom", zoombt:true, imgsize:"petite" };
// Lier au formulaire
var pi = wapp.setParamInput($("#formulaire"), p);
````

#### Définition des inputs d'un formulaire

Les input son des blocs HTML avec un paramètre data-input précisant leur type (text, check ou select).

L'attribut `data-param` définit la clé correspondant à la ligne de l'objet fourni. 
Si aucun paramètre ne correspond à cette clé, celle-ci est ajoutée à l'objet.    
L'application va ensuite gérer l'affichage et la saisie de la valeur en fonction des informations fournies par 
le formulaire et du type d'input.    
L'attribut data-default indique la valeur par défaut du paramètre concerné.    
Les data-input type select doivent fournir un liste d'options (`data-input-role="option"`) avec une valeur (`data-val`).    
Les input de type `custom` ne sont pas traités par l'application et c'est au programmeur de gérer son comportement et 
la mise à jour de la valeur associée dans le formulaire (afficher un dialogue par exemple).

##### input de type text
````html
<ul>
    <li data-input="text" data-param="name" data-default="sans nom">
        <input type="text"/><i class="clear-input"></i>
        <div data-input-role="info">Entrez un nom.</div>
    </li>
</ul>
````

##### input de type check
````html
<ul>
    <li data-input="check" data-param="zoombt" data-default="true" >
        <label>Boutons de zoom </label>
        <div data-input-role="info">Afficher les boutons de zoom sur la carte.</div>
    </li>
</ul>
````

##### input de type select
````html
<ul>
    <li data-input="select" data-param="imgsize">
        <label>Taille des images </label>
        <div data-input-role="option" data-val="max">Grande</div>
        <div data-input-role="option" data-val="med">Moyenne</div>
        <div data-input-role="option" data-val="min" data-default="true">Petite</div>
    </li>
</ul>
````

##### input de type custom
````html
<ul>
    <li data-input="custom" class="connect" onclick="wapp.connect();">
        <label>Identifiant de connexion </label>
        <div data-input-role="info">
            <span class="noinfo">Vous n'êtes pas connecté.</span>
            <span class="info">Vous êtes bien connecté.</span>
        </div>
    </li>
</ul>
````

#### Récupération des valeurs

Les valeurs sont modifiées sur place (l'objet fourni est modifié). 
Il n'est donc pas forcément nécessaire de récupérer la mise à jour. 
Cependant, la méthode {@link CordovApp#setParamInput setParamInput} renvoi un objet permettant de récupérer 
les valeurs (via getParams).

De même si vous modifier la valeur d'un paramètre, la méthode change() de l'objet renvoyé permet 
de mettre à jour le formulaire.

Le troisième argument de {@link CordovApp#setParamInput setParamInput} est 
une fonction de rappel appelée à chaque modification 
d'une valeur et qui fourni l'information du paramètre modifié. 
Il est alors possible de gérer la modification de manière spécifique pour d'appliquer 
un contrôle de cohérence par exemple.

@module CordovApp-Parametres
*/