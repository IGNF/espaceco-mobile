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