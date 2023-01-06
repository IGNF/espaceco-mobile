import Geolocation from 'ol/Geolocation'
import ol_control_Attribution from 'ol/control/Attribution'
import ol_control_CanvasScaleLine from 'ol-ext/control/CanvasScaleLine'
import ol_control_Disable from 'ol-ext/control/Disable'

import ol_control_Toggle from 'ol-ext/control/Toggle'

import map from './map'

import searchControl from './control/searchControl'
import switcherGuichet from "./control/switcherGuichet"
import switcherUserLayer from "./control/switcherUserLayer"
import switcherGeoportail from './control/switcherGeoportail'
import switcherCache from './control/switcherCache'
import ol_control_Button from 'ol-ext/control/Button'

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

  // Selecteur fonds en cache
  map.addControl (switcherCache(wapp));

  // Acces aux couches
  map.addControl (new ol_control_Toggle({
    className: 'switcher',
    html: '<i class="fa tools-layerstack"></i>',
    onToggle: () => {
      wapp.togglePage('couches');
    }
  }));

  /* Center on GPS */
  const geolocation = new Geolocation({
    trackingOptions: {
      maximumAge: 10000,
      enableHighAccuracy: true,
      timeout: 600000
    },
    projection: map.getView().getProjection()
  });
  geolocation.on('change', (e) => {
    map.getView().animate({
      center: geolocation.getPosition(),
      zoom: Math.max(16, Math.min(19, map.getView().getZoom()))
    });
    geolocation.setTracking(false);
  })

  // Control center GPS
  let recenter = false;
  let ctime = 0, locTime = 0; 
  let init = false;
  function centerLocation(geoloc) {
    geoloc.on('tracking', () => {
      if (recenter && geoloc.get('followTrack') !== 'auto') {
        if (!locTime) {
          locTime = (new Date()).getTime();
        } else if ((new Date()).getTime()-locTime > 10000) {
          geoloc.setFollowTrack('auto');
          locTime = 0;
        }
      }
    });
    // Reset on move end
    wapp.map.on('moveend', () => {
      if (geoloc.getActive() && geoloc.get('followTrack') !== 'auto') {
        locTime = (new Date()).getTime();
      }
    })
  }
  const centerGPS = new ol_control_Button({
    className: 'centergps',
    html: "<i class='fa tools-locate'></i>",
    handleClick: () => {
      if (!init) {
        centerLocation(wapp.interactions.geolocation);
        centerLocation(wapp.interactions.reportGeolocation);
        init = true;
      }
      var d = (new Date()).getTime();
      if (d-ctime < 500) {
        centerGPS.element.classList.add('center');
        recenter = true;
      } else {
        recenter = false;
        centerGPS.element.classList.remove('center');
      }
      wapp.interactions.geolocation.setFollowTrack('auto');
      wapp.interactions.reportGeolocation.setFollowTrack('auto');
      if (!wapp.interactions.geolocation.getActive() && !wapp.interactions.reportGeolocation.getActive()) {
        geolocation.setTracking(true);
      }
      ctime = d;
    }
  });
  map.addControl(centerGPS);
  /**/
}
