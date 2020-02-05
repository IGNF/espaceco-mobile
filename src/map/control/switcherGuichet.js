import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'

/** Layer switcher for Guichets
 * @param {CordovApp} wapp
 */
export default function(wapp) {
  const oldiv = $('#layer-guichet .guichet');

  wapp.getLayerGuichet().on('change', () => {
    oldiv.removeClass('offline');
  });
  // Layer switcher
  const guichetlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: document.querySelector('#layer-guichet .layerswitcher'), 
    reordering: true,
    layerGroup: wapp.getLayerGuichet()
  });

  // Affichage des layers et boutons
  guichetlayerSwitcher.on('drawlist', (e) => {
    var layer = e.layer;
    // Boutons
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // VectorCache
    if (layer.get('cache')) {
      oldiv.addClass('offline')
      ol_ext_element.create('I', {
        className: 'fa fa-pencil',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-refresh',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-cloud-download',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-gear',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
    } else if (layer.getFeatureType().tileZoomLevel) {
      // Couche editable
      oldiv.addClass('offline')
      ol_ext_element.create('I', {
        className: 'fa fa-pencil',
        click: () => {
          wapp.message(CordovApp.template('dialog-infoedit'), 'Edition');
        },
        parent: div
      });
    }

    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        console.log(layer)
      },
      parent: div
    });
  });
/*  
  wapp.getLayerGuichet().on('change', () => {
    var layer = wapp.getLayerGuichet();
    if (layer.getLayers && layer.getLayers().item(0)) {
      if (layer.getLayers().item(0).get('cache')) {
        $('#layer-guichet .guichet').addClass('offline');
      } else {
        $('#layer-guichet .guichet').removeClass('offline');
      }
    }
  });
*/
  return guichetlayerSwitcher;
};