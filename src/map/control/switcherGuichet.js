import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'

/** Layer switcher for Guichets
 * @param {CordovApp} wapp
 */
export default function(wapp) {
  /// Layer switcher
  const guichetlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: document.querySelector('#layer-guichet .layerswitcher.online'), 
    reordering: true,
    layerGroup: wapp.getLayerGuichet()
  });

  // Affichage des layers et boutons
  guichetlayerSwitcher.on('drawlist', (e) => {
    var layer = e.layer;
    if (wapp.getIdGuichet() + '-0' === layer.get('name')) {
      e.li.classList.add('online');
    } else if (wapp.getIdGuichet() + '-1' === layer.get('name')) {
      e.li.classList.add('offline');
    }
    e.li.classList.add('visible');
    if (layer.getLayers) {
      // Force expend
      layer.set('openInLayerSwitcher', true);
      // Hide 
      if (!e.layer.getVisible()) e.li.classList.remove('visible');
    }
    // Boutons
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // VectorCache
    if (layer.get('cache')) {
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
  
  // Gestion de la visibilite
  var toggle = document.querySelector('#layer-guichet .guichet .toggle input');
  toggle.addEventListener('change', () => {
    var layer = wapp.getLayerGuichet();
    if (layer.getLayers) {
      if (toggle.checked) {
        layer.getLayers().item(1).setVisible(false);
        layer.getLayers().item(0).setVisible(true);
      } else {
        layer.getLayers().item(1).setVisible(true);
        layer.getLayers().item(0).setVisible(false);
      }
    }
  });
  wapp.getLayerGuichet().on('change', () => {
    setTimeout(() => {
      var layer = wapp.getLayerGuichet();
      if (layer.getLayers) {
        var layers = layer.getLayers();
        // Check has layer cache
        if (layers.item(0) && wapp.getIdGuichet() + '-0' === layers.item(0).get('name')) {
          if (!layers.item(0).getVisible() && !layers.item(1).getVisible()) {
            layers.item(1).setVisible(true);
          }
          toggle.checked = layers.item(0).getVisible();
        }
      }
    }, 0);
  });
  
  return guichetlayerSwitcher;
};