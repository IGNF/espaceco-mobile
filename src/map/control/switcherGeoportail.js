import CordovApp from 'cordovapp/CordovApp'
import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import 'ol-ext/layer/GetPreview'


let geoportailSwitcher;

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
          geoportailSwitcher.drawPanel();
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
        wapp.cache.addCacheMap(wapp.param.options.mode === 'expert');
        layer.set('openInLayerSwitcher', true);
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
  const layer = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'geoportailGroup' });

  // Affichage du layerswitcher
  geoportailSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-geoportail .layerswitcher").get(0), 
    reordering: true,
    layerGroup: layer
  });
  geoportailSwitcher.on('layer:visible', () => {
    let vis = false;
    layer.getLayers().forEach((l)=> {
      vis = vis || l.getVisible();
    })
    layer.setVisible(vis);
  })

  // Show / hide layer
  const eye = $('#couches .geoportailmap .fa-eye').on('click', (e) => {
    e.stopPropagation();
    layer.setVisible(!layer.getVisible());
  });
  const eye2 = $('#layer-geoportail h3 .fa-eye').on('click', () => {
    layer.setVisible(!layer.getVisible());
  });
  const setVisibility = function() {
    if (layer.getVisible()) {
      eye.removeClass('fa-eye-slash');
      eye2.removeClass('fa-eye-slash');
    } else {
      eye.addClass('fa-eye-slash');
      eye2.addClass('fa-eye-slash');
    }
  };
  layer.on('change:visible', setVisibility);
  setVisibility();

  // Gestion de l'affichage des layers groupe si tous les layers contenant sont masques
  function checkVisibility (layer)  {
    if (layer.getLayers) {
      var visible = false;
      layer.getLayers().forEach((l) => {
        if (l.getVisible() && l.get('name')!=='Emprises') visible = true;
      });
      layer.setVisible(visible);
    }
  }
  // Gestion de la visibilite des fonds geoportail en fonction des fonds contenu dans le layer
  layer.getLayers().forEach((layer) => {
    layer.getLayers().forEach((l) => {
      l.on('change:visible', () => {
        checkVisibility(layer);
      });
    });
    layer.getLayers().on('add', (e) => {
      e.element.on('change:visible', () => {
        checkVisibility(layer);
      });
    });
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
      e.li.classList.add('confirme');
    } else if (e.layer.get('cacheMap')) {
      setActionCacheMap(wapp, e.layer, div);
      e.layer.on('change', () => geoportailSwitcher.drawPanel());
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
