import './userLayers.css'
import Cordovapp from 'cordovapp/cordovapp/CordovApp'

import WMSCapabilities from 'ol-ext/control/WMSCapabilities'
import ol_ext_element from 'ol-ext/util/element';
import wapp from '../wapp';

WMSCapabilities.prototype.labels = {
  formTitle: 'Titre:',
  formLayer: 'Layers:',
  formMap: 'Map:',
  formFormat: 'Format:',
  formMinZoom: 'Zoom mini:',
  formMaxZoom: 'Zoom maxi:',
  formExtent: 'Extent:',
  formProjection: 'Projection:',
  formCrossOrigin: '',
  formVersion: 'Version:'
};

let caps, dialog; 

/** Ajout d'un layer WMS
 */
Cordovapp.prototype.addUserLayer = function() {
  wapp.dialog.show(dialog, { className: 'dialogWMS', title: 'WMS', buttons: [], closeBox: true });
  // Update dialog
  caps.showDialog();
};

/** Remove a user layer
 */
function removeUserLayer(layer) {
  const wapp = new Cordovapp();
  for (let i=0, l; l = wapp.param.userLayers[i]; i++) {
    if ('USER-'+l.id === layer.get('name')) {
      wapp.param.userLayers.splice(i,1);
      break;
    }
  }
  var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
  lgroup.getLayers().remove(layer);
}
export { removeUserLayer }

/** Get user layers
 * @param {Cordowapp} wapp
 */
function getUserLayers() {
  const wapp = new Cordovapp();
  if (!wapp.param.userLayers) wapp.param.userLayers = [];
  if (!caps) {
    dialog = ol_ext_element.create('DIV');
    // Create WMS Capability reader
    caps =  new WMSCapabilities({
      target: dialog,
      popupLayer: true,
      searchLabel: '<i class="fa fa-search"></i>',
      loadLabel: 'Charger...',
      placeholder: 'url du service WMS...',
      previewLabel: 'aperçu'
    })
    wapp.map.addControl(caps);
    caps.on('load', (e) => {
      wapp.dialog.close();
      let nb = 0;
      wapp.param.userLayers.forEach((l) => {
        if (l.id > nb) nb = l.id;
      });
      // Parametre de la carte
      delete e.options.data;
      e.options.id = nb+1;
      e.options.type = 'WMS';
      e.layer.set('name', 'USER-'+e.options.id);
      wapp.param.userLayers.push(e.options);
      wapp.saveParam();
      // Ajouter la carte
      var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
      lgroup.getLayers().push(e.layer);
      wapp.showPage('layer-carte');
      lgroup.setVisible(true);
    })
  }

  // Load layers
  if (!wapp.param.userLayers) return [];
  var layers = [];
  wapp.param.userLayers.forEach((l)=> {
    switch (l.type) {
      case 'WMS':
      default: 
        const layer = caps.getLayerFromOptions(l);
        layer.set('name', 'USER-'+l.id);
        if (wapp.param.visibleLayers['USER-'+l.id]===false) layer.setVisible(false);
        else layer.setVisible(wapp.param.visibleLayers['USER-'+l.id]);
        layers.push(layer);
        break;
      
    }
  });
  return layers;
}

export default getUserLayers
