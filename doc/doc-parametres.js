


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
````xml
<ul>
    <li data-input="text" data-param="name" data-default="sans nom">
        <input type="text"/><i class="clear-input"></i>
        <div data-input-role="info">Entrez un nom.</div>
    </li>
</ul>
````

##### input de type check
````xml
<ul>
    <li data-input="check" data-param="zoombt" data-default="true" >
        <label>Boutons de zoom </label>
        <div data-input-role="info">Afficher les boutons de zoom sur la carte.</div>
    </li>
</ul>
````

##### input de type select
````xml
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
````xml
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