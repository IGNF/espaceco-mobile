import 'ol/ol.css'
import 'ol-ext/dist/ol-ext.css'
import './map.css'

import ol_Map from 'ol/Map'
import ol_View from 'ol/View'
import { defaults as ol_control_defaults } from 'ol/control'
import ol_layer_Group from 'ol/layer/Group'
import ol_layer_Tile from 'ol/layer/Tile'
import ol_layer_Vector from 'ol/layer/Vector'
import ol_source_TileWMS from 'ol/source/TileWMS'
import ol_style_Style from 'ol/style/Style'
import ol_style_Fill from 'ol/style/Fill'
import ol_style_Stroke from 'ol/style/Stroke'
import ol_style_Text from 'ol/style/Text'

import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import ol_source_DFCI from 'ol-ext/source/DFCI'
import ol_source_Geoportail from 'ol-ext/source/Geoportail'

import config from '../config'
import {dialog} from 'cordovapp/cordovapp/dialog'

// Layer pour l'affichage du cache
var layerCache = new ol_layer_Group({ title: 'Cartes hors-ligne', name: 'cache', openInLayerSwitcher: true, displayInLayerSwitcher: false })
layerCache.on('change', function() {
  if (layerCache.getLayers().getLength) layerCache.set('displayInLayerSwitcher', true);
});

// Layers geoportail
var geoportalLayers = [
  new ol_layer_Geoportail('GEOGRAPHICALGRIDSYSTEMS.MAPS', { hidpi: false, visible: true }, { gppKey: config.apiKey, authentication: config.auth }),
  new	ol_layer_Geoportail('GEOGRAPHICALGRIDSYSTEMS.PLANIGN', { hidpi: false, visible: false }, { gppKey: config.apiKey, authentication: config.auth }),
  new	ol_layer_Geoportail('ORTHOIMAGERY.ORTHOPHOTOS', { hidpi: false, visible: false}, { gppKey: config.apiKey, authentication: config.auth }),
  new ol_layer_Geoportail('GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1', { gppKey: config.apiKey, hidpi: false, visible: false }, { gppKey: config.apiKey, authentication: config.auth })
];
var geoportalOverlays = [
  new ol_layer_Geoportail('ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW', { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: true }, { gppKey: config.apiKey, authentication: config.auth }),
	new ol_layer_Geoportail("BUILDINGS.BUILDINGS", { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: false }, { gppKey: config.apiKey, authentication: config.auth }),
  new ol_layer_Geoportail('CADASTRALPARCELS.PARCELS', { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: true }, { gppKey: config.apiKey, authentication: config.auth }),
	new ol_layer_Geoportail("TRANSPORTNETWORKS.ROADS", { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: false }, { gppKey: config.apiKey, authentication: config.auth }),
  // Couche INSPIRE adresse
  new ol_layer_Tile ({
    title: 'Adresses',
    name: 'ADRESSES',
    desc: 'Localisation des propriétés fondée sur les identifiants des adresses, habituellement le nom de la rue, le numéro de la maison et le code postal.',
    extent: [ -7030196.346030043, -2438399.008686918, 6215711.586687296, 6645292.597727471 ],
    minResolution: 0,
    maxResolution: 4,
    visible: false,
    source: new ol_source_TileWMS({
      url: 'http://wxs.ign.fr/'+config.apiKey+'/inspire/v/wms',
      projection: 'EPSG:3857',
      crossOrigin: 'anonymous',
      tileLoadFunction: ol_source_Geoportail.tileLoadFunctionWithAuthentication(config.auth, 'image/png'),
      params: {
        LAYERS: 'AD.Address',
        FORMAT: 'image/png',
        VERSION: '1.3.0'
      }
    })
  }),
  new ol_layer_Vector({
    title: 'Carroyage DFCI',
    name: 'DFCI',
    desc: 'Le « carroyage DFCI » est un système de maillage géographique utilisé en France par les acteurs de la Défense des Forêts Contre les Incendies (DFCI).',
    source: new ol_source_DFCI(),
    renderMode:'image',
    visible: false,
    style: function(f) {
      return [ 
      new ol_style_Style({
        text: new ol_style_Text({
        text: f.get('id'),
        font: 'bold 9px sans-serif',
        backgroundFill: new ol_style_Fill ({ color: "rgba(255,255,255,.6)"}),
        fill: new ol_style_Fill({ color: '#f00'}),
        overflow: true,
        placement: 'point'
        }),
        fill: new ol_style_Fill({
        color: [0,0,0,0]
        }),
        stroke: new ol_style_Stroke({
        width: .75,
        color: '#000'
        })
      })
      ]
    }
  })
];

// Layers (set hdpi:false to enable tile cache)
var layers = [
  // Fonds de plan
  new ol_layer_Group({
    title: 'Fonds de plan', 
    name: 'GEOPORTAL_LAYERS',
    openInLayerSwitcher: true,
    layers: geoportalLayers
  }),
  // Layer pour l'affichage du cache
  layerCache,
  // Overlays
  new ol_layer_Group({
    title: 'Couches Géoportail', 
    name: 'GEOPORTAL_OVERLAYS',
    openInLayerSwitcher: true,
    layers: geoportalOverlays
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

// Prevent link to open 
/*
ol.Attribution.uniqueAttributionKey = {};
map.formatAttribution = function()
{	var a = ol.Map.Geoportail.prototype.formatAttribution.apply (map, arguments);
  return a.replace("<a href","<span data-href").replace("</a>","</span>");
};
*/

// Verifier qu'on a bien au moins un layer affiche
function checkVisible(layers) {
  var visible = false;
  if (!layers) layers = map.getLayers();
  layers.forEach(function(l) {
    if (!(l instanceof ol_layer_Vector) && l.getVisible()) {
      if (l instanceof ol_layer_Group) {
        if (checkVisible(l.getLayers())) visible=true;
      }
      else visible=true;
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
export default map;