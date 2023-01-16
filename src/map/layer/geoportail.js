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

const geoportailLayer = new ol_layer_Group({
  title: 'Géoservices', 
  name: 'geoportailGroup',
  openInLayerSwitcher: false
});
export { geoportailLayer }

/**
 * Ajout des layers dans l'ordre
 * @param {Object} layers object clé = nom de la couche valeur = objet layer ou objet vide
 */

function addLayers (layers) {
  let oneVisible = false;
  const caps = window.geoportailConfig.capabilities['default'];
  for (var name in layers) {
    if (caps[name]) {
      let visible = wapp.param.visibleLayers[name] || layers[name].visibility || false;
      if (visible) oneVisible = true;
      let options = { hidpi: false, visible: visible };
      if (layers[name] && Object.keys(layers[name]).length) {
        options["opacity"] = layers[name].opacity;
        options["zIndex"] = layers[name].order;
        if (layers[name].geoservice.length) {
          options["minZoom"] = layers[name].geoservice["min-zoom"];
          options["maxZoom"] = layers[name].geoservice["max-zoom"];
        }
      }
      let tileOptions = { authentication: config.auth };
      if (!caps[name]['key']) {
        options['gppKey'] = config.apiKey;
        tileOptions['gppKey'] = config.apiKey;
      }
      const gpl = new ol_layer_Geoportail(name, options, tileOptions);
      geoportailLayer.getLayers().push(gpl);
    } else {
      console.warn('[GEOPORATAIL-CONFIG] Bad layer: ', name);
    }
  }
  geoportailLayer.setVisible(true);
  if (!oneVisible) {
    let geolayers = geoportailLayer.getLayersArray();
    geolayers[0].setVisible(true);
  }
}

/** Add Geoportail layers to the map
 * @param {Object} list of layers
 */
function setGeoportailLayers(layers) {
  wapp.layerReady = false;

  geoportailLayer.getLayers().clear();
  if (!layers || !Object.keys(layers).length) {
    let defaultLayersByName = Object.fromEntries(defaultLayers.map(obj => [obj, {}]));
    addLayers(defaultLayersByName);
    return;
  } 
  
  addLayers(layers);

  wapp.layerReady = true;
}

export default setGeoportailLayers
