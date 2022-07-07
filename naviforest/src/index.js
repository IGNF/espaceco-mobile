import './style.css'
import './i18n'
import wapp from './guichet/guichet'
import './ripart/georemGPS'
import './codes'
import './maintenance'
import './apiTemplate'
import CordovApp from 'cordovapp/CordovApp';
import './jsNF/arretes';

// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;


document.addEventListener("deviceready", init, false);
document.addEventListener("DOMContentLoaded", init, false);

function init() {

  // $('<div id="arretes" data-role="page" data-direction="up" data-template="arretes"></div>'). insertAfter("div#loadGuichet");

  setTimeout(() => {
    
    console.log("onload");

    if ($('.arretes').length == 0 || $('.arretes').html() === undefined) {
      console.log('arretes');
      $('<li class=\'arretes\' onclick=\'wapp.getArrete() \')><i class="fa fa-file-pdf-o"></i>Arrêtés préfect</li>'). insertAfter("div[data-role='menu'] ul li.guichet");
      //$('<div id="arretes" "data-role"="page" onclick=\'wapp.getArrete()\'></div>'). insertAfter("div#loadGuichet");

     } else {
       console('déjà arretes');
     }

    $('head title').html("Naviforest");

   // $("button i.fa.tools-locate").prop('disabled', false);
    $("button i.fa.tools-locate").trigger('click');

   

    $('.buttons.changeGroupe button.button').hide();
    $('#changeGuichet').hide();


    if ($('span.connected').html() === "" ||
      wapp.ripart.getProfil() === undefined ||
      $('p.userinfo').html() === "Espace collaboratif") {
      $('p.userinfo').hide();

    } else {
      $('p.userinfo').show();
    }

    wapp.showLayers();
    wapp.refreshMap();
    $("button i.fa.tools-locate").trigger('click');

    var noconnect = '  Vous devez au préalable vous être inscrit sur le site '+
    '<a href="https://naviforest.ign.fr/register/" target="_system">'+
    'Naviforest</a> pour pouvoir effectuer une contribution.';
    $('.noconnect i').html(noconnect);
 
    }, 2000);
}

