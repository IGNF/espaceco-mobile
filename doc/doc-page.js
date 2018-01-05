/**
Fichier: `./js/wapp/cordovapp.page.js`

## Gestion des pages et templates

### Définition

La gestion des pages et des templates est faite dans le fichier 
`./js/wapp/cordovapp.page.js`.    
Il gère l'affichage des pages et du menu.

La navigation dans l'application web se fait via des pages qui s'affichent au dessus 
de la carte. Généralement, une seule page est active à un moment donné, bien qu'il soit possible 
d'afficher plusieurs pages en même temps.

Les pages sont définies via des blocs avec un role `page` dans la page de l'application 
(HMTL). L'identifiant de la div permet de gérer la page (affichage, fermeture, etc.).

````xml
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

````xml
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

````xml
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

````xml
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

Pour afficher une page il suffit d'appeler la fonction {@link CordovApp#showPage showPage} 
avec l'identifiant de la page à afficher. Utiliser {@link CordovApp#hidePage hidePage} 
pour la masquer.

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
de la page dans l'élément `<body>`. Cela peut être util pour gérer un affichage spécifique 
en fonction de la page affichée dans le CSS.*
````css
/&#42; Masquer la carte lorsque la page edition est affichee &#42;/
[data-page="edition"] #map {
    display: none;
}
````

## Gestion des onglets

Les onglets s'affichent automatiquement lorsqu'ils sont sélectionnés.

Il est également possible de les afficher programmatiquement via la méthode 
{@link CordovApp#showOnglet showOnglet}, {@link CordovApp#isOnglet isOnglet} indique si l'onglet est 
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

Il est possible de définir un menu à l'application. Pour cela, il suffit de déclarer un
élément avec un `data-role="menu"`.    
Si le contenu d'un menu est libre, le formatage par défaut utilise une liste (`<ul><li>`).    
Le menu peut être contenu dans un template (menu-`nom du template`) du repertoire templates.
````xml
<div data-role="menu" data-template="principal"></div>
````
et dans `./templates/menu-principal.html`:
````xml
<ul>
	<li class="search" onclick='wapp.showPage("search");'>
		<i class="fa fa-search"></i> Rechercher
	</li>
	<li onclick="wapp.showPage('apropos');">
		<i class="fa fa-info-circle"></i> A propos...
	</li>
</ul>
````

L'objet application a les méthodes pour gérer son affichage ({@link CordovApp#showMenu showMenu}, 
{@link CordovApp#hideMenu hideMenu}, {@link CordovApp#toggleMenu toggleMenu}) 
ou savoir si le menu est affiché ({@link CordovApp#isMenu isMenu}).   
L'affichage du menu est géré de manière identique à celui d'une page et un évènement 
de type `menu` est envoyé avec un attribut `show` (`boolean`) indiquant si le menu est 
affiché ou non.    
````
$(document).on("menu", function(e) {
    if (e.menu) console.log("Ouverture du menu");
    else console.log("Fermeture du menu");
});
````

@module CordovApp-Pages
*/
