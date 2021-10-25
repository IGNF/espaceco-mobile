import CordovApp from 'cordovapp/CordovApp'
import ol_style_Webpart from 'cordovapp/ol/style/Webpart'
import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'

/** Layer switcher for Guichets
 * @param {CordovApp} wapp
 */
export default function(wapp) {

  // Aide en ligne
  $('#layer-guichet').on('showpage', () => {
    if ($('#layer-guichet .guichet .edition').css('display') !== 'none') {
      setTimeout(() => { wapp.help.show('guichet-edition')});
    }
  });

  const oldiv = $('#layer-guichet .guichet');

  // Show / hide layer
  const layer = wapp.getLayerGuichet();
  const eye = $('#couches .guichet .fa-eye').on('click', (e) => {
    e.stopPropagation();
    layer.setVisible(!layer.getVisible());
  });
  const eye2 = $('#layer-guichet .guichet .fa-eye').on('click', () => {
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

  // Layer switcher
  const layerGuichet = wapp.getLayerGuichet();
  const guichetlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: document.querySelector('#layer-guichet .layerswitcher'), 
    reordering: true,
    layerGroup: layerGuichet
  });
  // Refresh on change
  wapp.getLayerGuichet().on('change', ()=>{
    guichetlayerSwitcher.drawPanel();
  });
  // None is visible ?
  guichetlayerSwitcher.on('layer:visible', (e) => {
    if (e.layer.getVisible() !== layerGuichet.getVisible()) {
      let vis = false;
      layerGuichet.getLayers().forEach((l)=> {
        vis = vis || l.getVisible();
      })
      layerGuichet.setVisible(vis);
    }
  })

  // Mode edition
  const edit = oldiv.get(0).querySelector('.edition');
  edit.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    wapp.saveContext();
    if (!wapp.getCache(wapp.guichet).cache) {
      wapp.vectorCache.addDialog(() => {
        //wapp.vectorCache.loadCache(wapp.getCache(wapp.guichet).cache);
        wapp.loadCache(true);
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

  // Editions en cours
  let nbEdit = 0;
  // Affichage des layers et boutons
  guichetlayerSwitcher.on('drawlist', (e) => {
    // Reset if first one
    if (!e.li.previousSibling.previousSibling) {
      oldiv.removeClass('offline');
      $('input', edit).prop('checked', (wapp.getCache(wapp.guichet).cache));
      // Edition en cours
      nbEdit = 0;
    }

    // Current layer
    var layer = e.layer;
    var featureType = layer.getFeatureType();

    // Boutons
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // VectorCache
    if (layer.get('cache')) {
      oldiv.addClass('offline');
      const edit = ol_ext_element.create('I', {
        className: 'fa',
        click: () => {
          layer.set('edit', layer.get('edit')===false);
          guichetlayerSwitcher.drawPanel();
        },
        parent: div
      });
      if (layer.get('edit') === false) {
        edit.classList.add('fa-lock');
      } else if (featureType.readOnly) {
        edit.classList.add('fa-unlock-alt');
      } else {
        edit.classList.add('fa-pencil');
      }
      const refresh = ol_ext_element.create('I', {
        className: 'fa fa-refresh',
        click: () => {
          wapp.updateCache(layer);
        },
        parent: div
      });
      if (!featureType.readOnly) {
        const nb = layer.getSource().nbModifications();
        nbEdit += nb;
        if (nbEdit) $('#couches .fa-refresh .tag').show().text(nbEdit);
        else $('#couches .fa-refresh .tag').hide();
        ol_ext_element.create('DIV', {
          className: 'tag',
          html: '<span>'+nb+'</span>',
          parent: refresh
        });
      }

      ol_ext_element.create('I', {
        className: 'fa fa-cloud-download',
        click: () => {
          //wapp.vectorCache.loadCache(wapp.getCache(wapp.guichet).cache);
          wapp.loadCache();
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-gear fa-disable',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
    } else if (featureType.readOnly) {
      var select = ol_ext_element.create('I', {
        className: 'fa',
        click: () => {
          layer.set('edit', layer.get('edit')===false);
          guichetlayerSwitcher.drawPanel();
        },
        parent: div
      });
      if (layer.get('edit') === false) {
        select.classList.add('fa-lock');
      } else {
        select.classList.add('fa-unlock-alt');
      }
    } else if (!featureType.readOnly && featureType.tileZoomLevel) {
      // Couche editable
      oldiv.addClass('offline')
      const edit = ol_ext_element.create('I', {
        className: 'fa',
        click: () => {
          layer.set('edit', layer.get('edit')===false);
          guichetlayerSwitcher.drawPanel();
        },
        parent: div
      });
      if (layer.get('edit') === false) {
        edit.classList.add('fa-lock');
      } else {
        edit.classList.add('fa-pencil');
      }
      if (wapp.getCache(wapp.guichet).cache) {
        ol_ext_element.create('I', {
          className: 'fa fa-cloud-download fa-plus',
          click: () => {
            wapp.appendLayerToCache(layer);
          },
          parent: div
        });  
      }
    }

    //pour certains objets comme les troncons de route le style est defini en dur
    //prise en compte d'un possible style alternatif defini sur le site
    if (featureType.style && featureType.styles.length == 0){
      featureType.styles.push(featureType.style);
    }

    if (featureType.styles && (featureType.styles.length > 1 || ol_style_Webpart[featureType.name])) {
      ol_ext_element.create('I', {
        className: 'fa tools-color confirme',
        click: () => {
          const sel = {}, st = {};
          var selected = featureType.style ? featureType.style.id : "default";
          if (ol_style_Webpart[featureType.name]) {
            sel["default"] = "Style par défaut";
            st["default"] = null;
          }

          featureType.styles.forEach((s) => {
            sel[s.id] = s.name;
            st[s.id] = s;
          });
          
          wapp.selectDialog(sel, selected, (s) => {
            featureType.style = st[s];
            layer.changed();
          });
        },
        parent: div
      });
    }

    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        const content = CordovApp.template("dialog-infocouche");
        console.log(e.layer.get('options'))
        if (e.layer.get('options').date) {
          $('.date span', content).text(e.layer.get('options').date);
        } else {
          $('.date', content).hide();
        }
        if (!e.layer.get('options').numrec) {
          $('.histo', content).hide();
        } else {
          $('.histo span', content).html(e.layer.get('options').numrec);
        }
        if (e.layer.getFeatureType()) {
          var ft = e.layer.getFeatureType();
          content.addClass(ft.readOnly || !ft.tileZoomLevel ? 'readonly':'edit');
          wapp.dataAttributes(content, ft);
        } else {
          wapp.dataAttributes(content, { 
            warning: true,
            title: 'Information indisponible', 
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
}
