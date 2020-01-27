import ol_control_Attribution from 'ol/control/Attribution'
import ol_control_CanvasScaleLine from 'ol-ext/control/CanvasScaleLine'
import ol_control_Disable from 'ol-ext/control/Disable'

import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_control_Toggle from 'ol-ext/control/Toggle'

import map from './map'


import searchControl from './control/searchControl'
import switcherGuichet from "./control/switcherGuichet"
import switcherUserLayer from "./control/switcherUserLayer"
import switcherGeoportail from './control/switcherGeoportail'

/** Initialize map controls
 */
export default function(wapp) {

  searchControl();

  // Scale line
  map.addControl (new ol_control_CanvasScaleLine());

  // Disable control
  const disableCtrl = wapp.disableCtrl = new ol_control_Disable();
  map.addControl (disableCtrl);

  // Attribution
  // map.setAttributionsMode("logo")
  map.addControl (new ol_control_Attribution({ collapsible:false }));

  // Menu
  map.addControl (new ol_control_Toggle({
    "className": "menuCtrl needsclick", 
    "html": "<i class='fa fa-bars'></i>",
    "toggleFn": function(){
      wapp.toggleMenu();
    }
  }));

  // Selecteur Guichets
  map.addControl (switcherGuichet(wapp));

  // Selecteur Carte utilisateur
  map.addControl (switcherUserLayer(wapp));

  // Selecteur fond geoportail
  map.addControl (switcherGeoportail(wapp));

  // Acces aux couches
  map.addControl (new ol_control_Toggle({
    className: 'switcher',
    html: '<i class="fa tools-layerstack"></i>',
    onToggle: () => {
      wapp.togglePage('couches');
    }
  }));

/* OLD VERSION */
console.log('[DEPRECATED] LayerSwitcher')
  // Layer switcher
  var lswitcher = new ol_control_LayerSwitcher({ 
    target:$("#layerswitcher").get(0), 
    reordering: true
  });

  // Guichet info
  lswitcher.on('drawlist', function(e) {
    if (e.layer.get('cache')) {
      $('<div>').addClass('nb')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .html (e.layer.getSource().nbModifications());
    }
    if (e.layer.get('name')==='guichet') {
      $('<div>').addClass('layerInfo')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .click(function(){
          wapp.showGuichetInfo(wapp.ripart.getGuichet());
        });
    }
    if (e.layer.get('vectorCache')) {
      $('<div>').addClass('layerSynchro')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .click(() => {
          wapp.vectorCache.saveLayer(e.layer.getLayers().getArray().slice(), e.layer.get('vectorCache'))
        });
    }
  });

  map.addControl (lswitcher);
/* END OLD */

  /*
  // Geolocation Control
  var geoloc = window.geoloc = new ol.control.Geolocate();
  geoloc.on("geolocate", function(e) 
    {	centerMap(e.position);
    });
  map.addControl(geoloc);
  */

}
