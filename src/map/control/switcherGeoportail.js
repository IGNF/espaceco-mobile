import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import 'ol-ext/layer/GetPreview'

/**
 * Action sur les cartes en cache
 * @param {CordovApp} wapp 
 * @param {*} smap
 * @param {Element} div 
 */
function setActionCacheMap (wapp, layer, div) {
  // Carte en cache
  const smap = layer.get('cacheMap');
  ol_ext_element.create('P', {
    html: smap.date,
    parent: div
  });
  // Refresh
  ol_ext_element.create('I', {
    className: 'fa fa-refresh',
    click: () => {
      wapp.cache.refreshCacheMap(smap);
    },
    parent: div
  });
  // Download
  ol_ext_element.create('I', {
    className: 'fa fa-cloud-download',
    click: () => {
      wapp.cache.loadCacheMap(smap);
    },
    parent: div
  });
  // Options (modifier le nom de la carte)
  ol_ext_element.create('I', {
    className: 'fa fa-gear',
    click: () => {
      wapp.prompt('Nom de la carte', smap.nom, (name) => {
        if (name) {
          smap.nom = name;
          layer.set('title', name);
        }
      });
    },
    parent: div
  });
  // Supprimer une carte
  ol_ext_element.create('I', {
    className: 'fa fa-trash',
    click: () => {
      wapp.cache.removeCacheMap(smap);
    },
    parent: div
  });
  // Info sur la carte
  ol_ext_element.create('I', {
    className: 'fa fa-info-circle',
    click: () => {
      var content = CordovApp.template('dialog-infomap');
      var title = new ol_layer_Geoportail(smap.layer).get('title')
      var att = $.extend({ name: title }, smap);
      wapp.dataAttributes(content, att);
      $('.centermap', content).get(0).addEventListener('click', () => {
        wapp.map.getView().fit(smap.extent, wapp.map.getSize());
        wapp.hidePage();
        wapp.dialog.close();
      });
      $('.loadmap', content).get(0).addEventListener('click', () => {
        wapp.cache.loadCacheMap(smap);
        wapp.dialog.close();
      });
      wapp.dialog.show (content, {
        title: layer.get('title'),
        buttons: { ok:'ok' }
      });
    },
    parent: div
  });
};

/** Action sur le Layer contenant les caches
 * @param {CordovApp} wapp
 * @param {Element} div 
 */
function setActionCache(wapp, layer, div) {
  div.parentNode.className += ' cache';
  // Ajouter une carte en cache
  if (wapp.ripart.param.offline) {
    ol_ext_element.create('I', {
      className: 'fa fa-plus-circle',
      click: () => {
        wapp.cache.addCacheMap();
      },
      parent: div
    });
  }
  // Info sur la carte
  ol_ext_element.create('I', {
    className: 'fa fa-info-circle',
    click: () => {
      var content = CordovApp.template('dialog-infocache');
      content.addClass(wapp.ripart.param.offline ? 'offline' : 'online');
      wapp.dialog.show (content, {
        title: 'Mode hors-ligne',
        buttons: { ok:'ok' }
      });
    },
    parent: div
  });
};

/**
 * Geoportail layer switcher
 * @param {CordovApp} wapp 
 */
export default function(wapp) {
  const geoportailSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-geoportail .layerswitcher").get(0), 
    reordering: true,
    displayInLayerSwitcher: (l) => {
      return (
        (/DFCI|cache|Fond\ de\ plan/.test(l.get('name')) || l instanceof ol_layer_Geoportail)
        && 
        l.get('displayInLayerSwitcher') !== false
      );
    }
  });

  // Affichage des actions des couches
  geoportailSwitcher.on('drawlist', (e) => {
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // Gestion du cache geoportail
    if (e.layer.get('name') === 'cache') {
      setActionCache(wapp, e.layer, div);
    } else if (e.layer.get('cacheMap')) {
      setActionCacheMap(wapp, e.layer, div);
    } else if (e.layer.get('desc')) {
      // Description
      ol_ext_element.create('I', {
        className: 'fa fa-info-circle',
        click: () => {
          wapp.message(e.layer.get('desc'), 
            '<i class="fa fa-info-circle fa-2x"></i> '+(e.layer.get('title')||e.layer.get('name')),
            null,
            null,
            'layerInfo'
          );
          // Display preview image
          if (e.layer.getSource().getTileLoadFunction) {
            const img = new Image();
            img.onload = function() {
              const msg = document.querySelector('[data-role="dialog"].layerInfo .content');
              msg.insertBefore(img, msg.childNodes[0]);
            };
            const loader = e.layer.getSource().getTileLoadFunction();
            loader({ getImage: function() { return img; }}, e.layer.getPreview()[0]);
          }
        },
        parent: div
      });
    }
  });

  return geoportailSwitcher;
};
