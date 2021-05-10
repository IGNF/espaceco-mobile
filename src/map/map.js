import 'ol/ol.css'
import 'ol-ext/dist/ol-ext.css'
import './map.css'

import ol_Map from 'ol/Map'
import ol_View from 'ol/View'
import { defaults as ol_control_defaults } from 'ol/control'
import ol_layer_Group from 'ol/layer/Group'
import ol_layer_Vector from 'ol/layer/Vector'

import { geoportailLayer, geoportailOverlay } from './layer/geoportail'
import {dialog} from 'cordovapp/cordovapp/dialog'

// Layer pour l'affichage du cache
var layerCache = new ol_layer_Group({ title: 'Cartes hors-ligne', name: 'cache', openInLayerSwitcher: false, displayInLayerSwitcher: true })
layerCache.on('change', function() {
  if (layerCache.getLayers().getLength) layerCache.set('displayInLayerSwitcher', true);
});

// Layers 
var layers = [
  new ol_layer_Group({
    title:'Mes couches', 
    name: 'geoportailGroup',
    visible: true,
    layers: [
      // Fonds de plan
      geoportailLayer,
      // Layer pour l'affichage du cache
      layerCache,
      // Overlays
      geoportailOverlay
    ]
  }),
  // Layer pour l'affichage des couches du groupe
  new ol_layer_Group({ title:'Mes couches', name: 'groupe', displayInLayerSwitcher: false, openInLayerSwitcher: true }),
  // Layer pour l'affichage du guichet
  new ol_layer_Group({ title:'Mon guichet', name: 'guichet', visible: true })
];

// The map
var map = new ol_Map({
  view: new ol_View ({
    zoom: 5,
    center: [166326, 5992663]
  }),
  controls: ol_control_defaults({ attribution:false }),
  //interactions: ol_interaction_defaults(),
  layers: layers
});

// Verifier qu'on a bien au moins un layer affiche
function checkVisible(layers) {
  var visible = false;
  if (!layers) layers = map.getLayers();
  layers.forEach(function(l) {
    if (!(l instanceof ol_layer_Vector) && l.getVisible()) {
      if (l instanceof ol_layer_Group) {
        if (checkVisible(l.getLayers())) visible=true;
      } else {
        visible = true;
      }
    }
  });
  return visible;
}

$('#layer-geoportail').on('hidepage', function() {
  if (!checkVisible()) {
    dialog.show (
      "Toutes les couches sont masquées.<br/>"
      +"Il se peut que vous ayez des problèmes à vous repérer&nbsp;!", {
        title: "ATTENTION",
        icon: "<i class='fa fa-eye-slash fa-3x'></i>",
        className: "alert",
        buttons:{ cancel:"ok" }
      }
    );
  }
});

export { layers }
export { layerCache }
export default map;