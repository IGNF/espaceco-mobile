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

// Layers geoportail
const defaultLayers = [
  'GEOGRAPHICALGRIDSYSTEMS.MAPS',
  'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
  'ORTHOIMAGERY.ORTHOPHOTOS'
];

const defaultOverlays = [
  new ol_layer_Geoportail('ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW', { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: true }, { gppKey: config.apiKey, authentication: config.auth }),
  new ol_layer_Geoportail('CADASTRALPARCELS.PARCELS', { gppKey: config.apiKey, hidpi: false, visible: false, displayInLayerSwitcher: true }, { gppKey: config.apiKey, authentication: config.auth })
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
      let options = { hidpi: false, visible: wapp.param.visibleLayers[l] || false };
      let tileOptions = { authentication: config.auth };
      if (!caps[l]['key']) {
        options['gppKey'] = config.apiKey;
        tileOptions['gppKey'] = config.apiKey;
      }
      const gpl = new ol_layer_Geoportail(l, options, tileOptions);
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

  wapp.layerReady = true;
}

export default setGeoportailLayers
