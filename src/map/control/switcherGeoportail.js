import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import 'ol-ext/layer/GetPreview'

/**
 * Ajout des actions pour les cartes en cache dans leur barre d'icone
 * @param {CordovApp} wapp 
 * @param {ol.layer} layer 
 * @param {Element} div Barre d'icone (icn-bar) 
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
}

/** Ajout des actions pour le Layer contenant les caches dans leur barre d'icone
 * @param {CordovApp} wapp
 * @param {ol.layer.Group} layer 
 * @param {Element} div Barre d'icone (icn-bar) 
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
}

/**
 * Layer switcher pour les couches Geoportail
 * @param {CordovApp} wapp 
 */
export default function(wapp) {
  // Affichage du layerswitcher
  const geoportailSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-geoportail .layerswitcher").get(0), 
    reordering: true,
    displayInLayerSwitcher: (l) => {
      return (
        (/DFCI|cache|GEOPORTAL_LAYERS|GEOPORTAL_OVERLAYS|ADRESSES/.test(l.get('name')) || l instanceof ol_layer_Geoportail)
        && 
        l.get('displayInLayerSwitcher') !== false
      );
    }
  });

  // Gestion de l'affichage des layers groupe si tous les layers contenant sont masques
  function checkVisibility (e)  {
    const layer = e.target;
    if (layer.getLayers) {
      var visible = false;
      layer.getLayers().forEach((l) => {
        if (l.getVisible()) visible = true;
      });
      layer.setVisible(visible);
    }
  }
  // Gestion de la visibilite des fonds geoportail
  wapp.layers.forEach((l) => {
    if (/GEOPORTAL_LAYERS|GEOPORTAL_OVERLAYS/.test(l.get('name'))) {
      l.on('change', checkVisibility);
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
            loader({ 
              getImage: function() { return img; }}, 
              e.layer.getPreview()[0]
            );
          }
        },
        parent: div
      });
    }
  });

  return geoportailSwitcher;
}
