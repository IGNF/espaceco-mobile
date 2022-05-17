import CordovApp from 'cordovapp/CordovApp'
import CacheExtents from 'cordovapp/ol/cache/CacheExtents';
import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import ol_ext_element from 'ol-ext/util/element'
import { selectDialog } from 'cordovapp/cordovapp/dialog';

let cacheSwitcher;
let cacheExtents;

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
      let extentNames = cacheExtents.getExtentNames();
      extentNames["new"] = "Nouvelle...";
      selectDialog(
        extentNames, 
        'new', 
        function(selected) {
          if (selected == 'new') {
            wapp.cache.loadCacheMap(smap);
          } else {
            wapp.cache.setCurrentMap(smap);
            let extent = cacheExtents.getAllInOneExtent(selected);
            wapp.cache.loadMapDlg(extent);
          }
        },
        {'title': 'Choisir une zone'}
      );
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

/** Layer switcher for CacheMap
 * @param {CordovApp} wapp
 */
export default function(wapp) {
    const offlinelayer = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'cache' });
    cacheExtents = new CacheExtents(wapp);

    // Affichage du layerswitcher
    cacheSwitcher = new ol_control_LayerSwitcher({
        target: $("#cache-layers-fond .layerswitcher").get(0), 
        reordering: true,
        layerGroup: offlinelayer
    });
    cacheSwitcher.on('layer:visible', () => {
        let vis = false;
        offlinelayer.getLayers().forEach((l)=> {
        vis = vis || l.getVisible();
        })
        offlinelayer.setVisible(vis);
    });
    
    const offEye = $('#layer-geoportail .couche.offline .fa-eye').on('click', (e) => {
      e.stopPropagation();
      offlinelayer.setVisible(!offlinelayer.getVisible());
    });
    const offEye2 = $('#cache-layers-fond .fa-eye').on('click', () => {
      offlinelayer.setVisible(!offlinelayer.getVisible());
    });
    const setOffVisibility = function() {
      if (offlinelayer.getVisible()) {
        offEye.removeClass('fa-eye-slash');
        offEye2.removeClass('fa-eye-slash');
      } else {
        offEye.addClass('fa-eye-slash');
        offEye2.addClass('fa-eye-slash');
      }
    };
    offlinelayer.on('change:visible', setOffVisibility);
    setOffVisibility();

    cacheSwitcher.on('drawlist', (e) => {
      const div = ol_ext_element.create('DIV', {
        className: 'icn-bar',
        parent: e.li
      });

      if (e.layer.get('cacheMap')) {
        setActionCacheMap(wapp, e.layer, div);
        e.layer.on('change', () => cacheSwitcher.drawPanel());
      }
    });

    return cacheSwitcher;
}