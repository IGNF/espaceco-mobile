import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'

/** Layer switcher for Guichets
 * @param {CordovApp} wapp
 */
export default function(wapp) {
  const oldiv = $('#layer-guichet .guichet');

  // Layer switcher
  const guichetlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: document.querySelector('#layer-guichet .layerswitcher'), 
    reordering: true,
    layerGroup: wapp.getLayerGuichet()
  });

  // Mode edition
  const edit = oldiv.get(0).querySelector('.edition');
  edit.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!wapp.getCache(wapp.guichet).cache) {
      wapp.vectorCache.addDialog(() => {
        //wapp.vectorCache.loadCache(wapp.getCache(wapp.guichet).cache);
        wapp.loadCache()
      });
    } else {
      wapp.message(
        'Voulez-vous supprimer les données en cache ?<br/><i>Les saisies en cours seront perdues...</i>',
        'Supprimer',
        { ok: 'ok', cancel: 'Annuler' },
        (button) => {
          if (button==='ok') wapp.vectorCache.removeCache(wapp.getCache(wapp.guichet).cache);
        }
      );
      
    }
  });

  // Affichage des layers et boutons
  guichetlayerSwitcher.on('drawlist', (e) => {
    // Reset if first one
    if (!e.li.previousSibling.previousSibling) {
      oldiv.removeClass('offline');
      $('input', edit).prop('checked', (wapp.getCache(wapp.guichet).cache));
    }

    //
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
          //wapp.vectorCache.loadCache(wapp.getCache(wapp.guichet).cache);
          wapp.loadCache();
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
    } else if (layer.getFeatureType().readOnly) {
      ol_ext_element.create('I', {
        className: 'fa fa-lock',
        click: () => {
          //wapp.message(CordovApp.template('dialog-infoedit'), 'Edition');
        },
        parent: div
      });
    } else if (!layer.getFeatureType().readOnly && layer.getFeatureType().tileZoomLevel) {
      // Couche editable
      oldiv.addClass('offline')
      ol_ext_element.create('I', {
        className: 'fa fa-pencil',
        click: () => {
          wapp.message(CordovApp.template('dialog-infoedit'), 'Edition');
        },
        parent: div
      });
      if (wapp.getCache(wapp.guichet).cache) {
        ol_ext_element.create('I', {
          className: 'fa fa-cloud-download',
          click: () => {
            //wapp.vectorCache.loadCache(wapp.getCache(wapp.guichet).cache);
            wapp.loadCache();
          },
          parent: div
        });  
      }
    }

    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        const content = CordovApp.template("dialog-infocouche");
        if (e.layer.getFeatureType()) {
          wapp.dataAttributes(content, e.layer.getFeatureType());
        } else {
          wapp.dataAttributes(content, { 
            warning: true,
            title: 'Information disponible', 
            description: 'Impossible de se connecter au serveur...' 
          });
        }
        wapp.dialog.show(content, { className: 'dialog-infocouche' });
        $('img', content).hide();
        wapp.getLogo (wapp.guichet, (f) => {
          if (f) $('img', content).attr('src',f).show();
        });  
      },
      parent: div
    });
  });

  return guichetlayerSwitcher;
};