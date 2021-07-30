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

import '../capabilities'
import config from '../../config'
import wapp from '../../wapp'

// Couche INSPIRE adresse
const inspireAdress = new ol_layer_Tile ({
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
});

// Carroyage DFCI
const dfci = new ol_layer_Vector({
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
});

// Layers geoportail
const defaultLayers = [
  'GEOGRAPHICALGRIDSYSTEMS.MAPS',
  'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
  'ORTHOIMAGERY.ORTHOPHOTOS'
  /*
  new ol_layer_Geoportail('GEOGRAPHICALGRIDSYSTEMS.MAPS', { gppKey: config.apiKey, hidpi: false, visible: false }, { gppKey: config.apiKey, authentication: config.auth }),
  new	ol_layer_Geoportail('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', { gppKey: config.apiKey, hidpi: false, visible: true }, { gppKey: config.apiKey, authentication: config.auth }),
  new	ol_layer_Geoportail('ORTHOIMAGERY.ORTHOPHOTOS', { gppKey: config.apiKey, hidpi: false, visible: false}, { gppKey: config.apiKey, authentication: config.auth }),
  */
];

const defaultOverlays = [
  new ol_layer_Geoportail('ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW', { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: true }, { gppKey: config.apiKey, authentication: config.auth }),
  new ol_layer_Geoportail('CADASTRALPARCELS.PARCELS', { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: true }, { gppKey: config.apiKey, authentication: config.auth }),
  dfci
];

const geoportailOverlays = {
  'HYDROGRAPHY.HYDROGRAPHY': 1,
  'CADASTRALPARCELS.PARCELS': 1,
  'CADASTRALPARCELS.PARCELLAIRE_EXPRESS': 1,
  'ADMINISTRATIVEUNITS.BOUNDARIES': 1,
  'BUILDINGS.BUILDINGS': 1,
  'TRANSPORTNETWORKS.RAILWAYS': 1,
  'TRANSPORTNETWORKS.ROADS': 1
}

const geoportailLayer = new ol_layer_Group({
  title: 'Fonds Géoportail', 
  name: 'GEOPORTAL_LAYERS',
  openInLayerSwitcher: false
});
export { geoportailLayer }

const geoportailOverlay = new ol_layer_Group({
  title: 'Couches Géoportail', 
  name: 'GEOPORTAL_OVERLAYS',
  openInLayerSwitcher: false
});
export { geoportailOverlay }


// Ajout des layers dans l'ordre
function addLayers (layers) {
  const keys = Object.keys(wapp.param.visibleLayers);
  layers.sort((a,b) => keys.indexOf(a) - keys.indexOf(b));
  const caps = window.geoportailConfig.capabilities['default'];
  layers.forEach((l) => {
    if (caps[l]) {
      const gpl = new ol_layer_Geoportail(l, { gppKey: config.apiKey, hidpi: false, visible: wapp.param.visibleLayers[l] || false }, { gppKey: config.apiKey, authentication: config.auth });
      if (geoportailOverlays[l]) {
        geoportailOverlay.getLayers().push(gpl);
      } else {
        geoportailLayer.getLayers().push(gpl);
      }
    } else {
      console.warn('[GEOPORATAIL-CONFIG] Bad layer: ', l);
    }
  });
}

/** Add Geoportail layers to the map
 * @param {Object} list of layers
 */
function setGeoportailLayers(layers) {
  wapp.layerReady = false;

  geoportailLayer.getLayers().clear();
  geoportailOverlay.getLayers().clear();
  geoportailOverlay.set('displayInLayerSwitcher', true);
  if (!layers || !Object.keys(layers).length) {
    addLayers(defaultLayers);
    return;
  } 
  
  layers = Object.keys(layers);
  addLayers(layers);

  geoportailOverlay.getLayers().push(inspireAdress);
  geoportailOverlay.getLayers().push(dfci);
  wapp.layerReady = true;
}

export default setGeoportailLayers
