import './style.css'
import './i18n'
import wapp from './guichet/guichet'
import './ripart/georemGPS'
import './codes'
import './maintenance'
import './apiTemplate'
import CordovApp from 'cordovapp/CordovApp';

// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;  


document.addEventListener("deviceready", init, false);
document.addEventListener("DOMContentLoaded", init, false);
  function init(){
    setTimeout(() => { 
        console.log("onload");
        
        // wapp.help.reset();
        // wapp.hidePage();
        $("div[data-role='menu'] .logo.back").hide();
         $("div[data-role='menu'] .img").css({'background-color': 'rgba(255,255,255,0)'});
         $('<li onclick=\'console.log("arretés")\')><i class="fa fa-file-pdf-o"></i>Arrêtés préfect</li>').insertAfter("div[data-role='menu'] ul li.guichet");
        $('head title').html("Naviforest");
       
        // $("button i.fa.tools-locate").prop('disabled', false);
        // $("button i.fa.tools-locate").trigger('click');
        // wapp.help.show('main');
        $('.buttons.changeGroupe button.button').hide();
        
      }, 1000);
  }

   