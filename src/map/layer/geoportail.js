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
  let layersArr = Object.keys(layers);
  let oneVisible = false;
  const caps = window.geoportailConfig.capabilities['default'];
  //on ordonne les couches selon leur ordre dans visibleLayers (chargement depuis cache) ou selon le parametre order (au premier chargement)
  let cacheOrdered = true;
  for (var key in layers) {
    if (!(key in wapp.param.visibleLayers)) {
      cacheOrdered = false;
      break;
    }
  }
  if (cacheOrdered) {
    const keys = Object.keys(wapp.param.visibleLayers);
    layersArr.sort((a,b) => keys.indexOf(a) - keys.indexOf(b));
  } else {
    layersArr.sort((a,b) => layers[a].order - layers[b].order)
  }
  for (var i in layersArr) {
    let name = layersArr[i];
    let layer = layers[name];
    /* if (caps[name]) {
      console.log("caps name", name, caps[name])
      let visible = name in wapp.param.visibleLayers ? wapp.param.visibleLayers[name] : (layer.visibility || false);
      if (visible) oneVisible = true;
      let options = { hidpi: false, visible: visible};
      if (layer && layer.geoservice && layer.geoservice.description) {
        options["desc"] = layer.geoservice.description;
      }
      let tileOptions = {};
      if (layer && Object.keys(layer).length) {
        options["opacity"] = name in wapp.param.visibleLayers ? wapp.param.visibleLayers[name] : (layer.opacity || 1);
        if (layer.geoservice.length) {
          options["minZoom"] = layer.geoservice["min-zoom"];
          options["maxZoom"] = layer.geoservice["max-zoom"];
        } else {
          options['gppKey'] = caps[name]['key'];
          tileOptions['gppKey'] = caps[name]['key'];
        }
      }
      
      if (caps[name].server) tileOptions['server'] = caps[name].server;
      if (!caps[name]['key']) {
        options['gppKey'] = config.apiKey;
        tileOptions['gppKey'] = config.apiKey;
      }
      const gpl = new ol_layer_Geoportail(name, options, tileOptions);
      geoportailLayer.getLayers().push(gpl);
    } else {
      console.warn('[GEOPORATAIL-CONFIG] Bad layer: ', name);
    } */
    
    let visible = name in wapp.param.visibleLayers ? wapp.param.visibleLayers[name] : (layer.visibility || false);
    if (visible) oneVisible = true;
    let options = { hidpi: false, visible: visible};
    if (layer && layer.geoservice && layer.geoservice.description) {
      options["desc"] = layer.geoservice.description;
    }
    let tileOptions = {};
    if (layer && Object.keys(layer).length) {
      options["opacity"] = name in wapp.param.visibleLayers ? wapp.param.visibleLayers[name] : (layer.opacity || 1);
      url = layer.geoservice["url"]
      console.log(url.split("?")[0], config.apiKey, caps[name]['key'])
      if (layer.geoservice) {
        options["minZoom"] = layer.geoservice["min-zoom"];
        options["maxZoom"] = layer.geoservice["max-zoom"];
        tileOptions['server'] = url.split("?")[0];
        url.includes("private") ? tileOptions['gppKey'] = "ign_scan_ws" : tileOptions['gppKey'] = "gpf"
        options['gppKey'] = tileOptions['gppKey']
      } else {
        if(caps[name]) {
          options['gppKey'] = caps[name]['key'];
          tileOptions['gppKey'] = caps[name]['key'];
          tileOptions['server'] = caps[name].server;
        }
        else {
          console.warn('[GEOPORTAIL-CONFIG] Bad layer: ', name);
        }
      }
    }
    const gpl = new ol_layer_Geoportail(name, options, tileOptions);
    geoportailLayer.getLayers().push(gpl);
  }
  geoportailLayer.setVisible(true);
  if (!oneVisible) {
    let geolayers = geoportailLayer.getLayersArray();
    if (geolayers[0]) geolayers[0].setVisible(true);
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
