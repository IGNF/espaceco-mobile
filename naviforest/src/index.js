import './style.css'
import './i18n'
import wapp from './guichet/guichet'
import './ripart/georemGPS'
import './codes'
import './maintenance'
import './apiTemplate'
import CordovApp from 'cordovapp/CordovApp';
import './jsNF/arretes';
import './guichet/createupdateObject';

// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;

document.addEventListener("deviceready", init, false);
document.addEventListener("DOMContentLoaded", init, false);


/**
 * Elements/fonctionalités spécifiques à Naviforest
 */
function init() {

  setTimeout(() => {

    console.log("onload");

    //affichage des arrêtés
    if ($('.arretes').length == 0 || $('.arretes').html() === undefined) {
      $('<li class=\'arretes\' onclick=\'wapp.getArrete() \')><i class="fa fa-file-pdf-o"></i>Arrêtés préfect</li>').insertAfter("div[data-role='menu'] ul li.guichet");
    }
    
    // le titre 
    $('head title').html("Naviforest");

    // centrer la carte à l'emplacement de l'utilisateur
    $("button i.fa.tools-locate").trigger('click');

    $('.buttons.changeGroupe button.button').hide();
    $('#changeGuichet').hide();

    //action sur le bouton d'édition    
     $('#createupdateObj').attr('onclick', "wapp.createupdateGeom(['Point'])");

    //affichage des infos de l'utilisateur s'il est connecté
    if ($('span.connected').html() === "" ||
      wapp.ripart.getProfil() === undefined ||
      $('p.userinfo').html() === "Espace collaboratif") {
      $('p.userinfo').hide();

    } else {
      $('p.userinfo').show();
    }

    wapp.showLayers();
    wapp.refreshMap();
    // centrer la carte à l'emplacement de l'utilisateur
    $("button i.fa.tools-locate").trigger('click');

    var noconnect = '  Vous devez au préalable vous être inscrit sur le site ' +
      '<a href="https://naviforest.ign.fr/register/" target="_system">' +
      'Naviforest</a> pour pouvoir effectuer une contribution.';
    $('.noconnect i').html(noconnect);

  }, 2000);
}

