import CordovApp from 'cordovapp/CordovApp'
import { messageDlg } from 'cordovapp/cordovapp/dialog'
import ol_style_Collaboratif from 'cordovapp/ol/style/Collaboratif'
import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'

import editionMode from '../../guichet/editionMode'
import { prettifyAxiosError } from 'cordovapp/collaboratif/errorHelper'

let cacheSwitcher;

/** Layer switcher for Guichets
 * @param {CordovApp} wapp
 */
export default function(wapp) {
  $('#layer-guichet').on('showpage', () => {
    // boutons tout masquer/afficher
    let displayAll = function(display) {
      let groupLayer = wapp.getLayerGuichet();
      let groupVisibility = groupLayer.getVisible();
      groupLayer.getLayers().forEach((l) => {
        l.setVisible(display);
      });
      if (groupVisibility != groupLayer.getVisible()) groupLayer.setVisible(groupVisibility);
    };
    $(".all-layer-vibility-btn.show").on("click", (e) => {
      displayAll(true);      
    });
    $(".all-layer-vibility-btn.hide").on("click", (e) => {
      displayAll(false);      
    });

    // Aide en ligne
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

  // Affichage des layers et boutons
  guichetlayerSwitcher.on('drawlist', (e) => {
    // Reset if first one
    if (!e.li.previousSibling.previousSibling) {
      oldiv.removeClass('offline');
    }

    // Current layer
    var layer = e.layer;
    var table = layer.getTable();

    // Boutons
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });

    var locked = table.read_only || layer.get('edit') === false || !table.tile_zoom_level || layer.get('role') !== 'edit';

    //sauvegarde
    if (table && !locked) {
      // Save Button
      const saveBtn = ol_ext_element.create('I', {
        className: 'fa fa-send fa-disable ',
        click: () => {
          if (saveBtn.classList.contains("fa-disable")) return;
          if (layer.get('cache')) {
            //on sauvegarde et on recharge les donnees en cache
            let cache = wapp.getCache(wapp.guichet).cache;
            wapp.vectorCache.saveLayer([layer], cache);
          } else {
            layer.getSource().save(()=>{
              wapp.notification(layer.get('title')+' sauvegardé...');
            }, (error, transaction) => {
              wapp.wait(false);
              // Look for transaction
              console.log('ERROR', error, transaction)
              if (transaction) {
                wapp.handleConflict(transaction, layer);
              } else {
                let prettyError = prettifyAxiosError(error);
                wapp.alert('Impossible de sauvegarder '+layer.get('title')+'<br/><i class="error">'+prettyError.message+'</i>');
              }
            });
          }
        },
        parent: div
      });
      // Reset
      const reset = ol_ext_element.create('I', {
        className: 'fa fa-undo',
        click: () => {
          if (reset.classList.contains("fa-disable")) return;
          messageDlg(
            "Supprimer toutes les modifications sur la couche et recharger les données?", 
            " ", 
            {
              ok: "supprimer",
              cancel: "annuler"
            },
            function (b) {
              if (b=="ok") {
                layer.getSource().reset();
              }
            }
          );
        },
        parent: div
      })
      // Show modifications
      let nbEdit = layer.getSource().nbModifications();
      if (nbEdit) {
        ol_ext_element.create('DIV', {
          className: 'tag',
          html: '<span>'+nbEdit+'</span>',
          parent: saveBtn
        });
        $('.tag', saveBtn).text(nbEdit);
        saveBtn.classList.remove("fa-disable");
      } else {
        saveBtn.classList.add("fa-disable");
      }

      // Couche editable
      oldiv.addClass('offline')
      // Edition tools
      if (layer.get('role') === 'edit') {
        ol_ext_element.create('I', {
          className: 'fa fa-pencil-square-o',
          click: (e) => { editionMode(wapp, layer) },
          parent: div
        });
      }
    }
      
    // Enable selection
    let noEdit = !table || table.read_only || !table.tile_zoom_level || layer.get('role') !== 'edit';
    const edit = ol_ext_element.create('I', {
      className: 'fa',
      click: () => {
        if (noEdit) {
          wapp.alert("Cette couche n'est pas éditable");
        } else {
          layer.set('edit', layer.get('edit')===false);
          guichetlayerSwitcher.drawPanel(); 
        } 
      },
      parent: div
    });

    if (locked) {
      edit.classList.add('fa-lock');
    } else {
      edit.classList.add('fa-unlock');
    }

    //pour certains objets comme les troncons de route le style est defini en dur
    //prise en compte d'un possible style alternatif defini sur le site
    if (table.style && table.styles.length == 0){
      table.styles.push(table.style);
    }

    if (table.styles && (table.styles.length > 1 || ol_style_Collaboratif[table.name])) {
      ol_ext_element.create('I', {
        className: 'fa tools-color expert',
        click: () => {
          const sel = {}, st = {};
          var selected = table.style ? table.style.id : "default";
          if (ol_style_Collaboratif[table.name]) {
            sel["default"] = "Style par défaut";
            st["default"] = null;
          }

          table.styles.forEach((s) => {
            sel[s.id] = s.name;
            st[s.id] = s;
          });
          
          wapp.selectDialog(sel, selected, (s) => {
            table.style = st[s];
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
        if (e.layer.getTable()) {
          var table = e.layer.getTable();
          content.addClass(noEdit ? 'readonly':'edit');
          wapp.dataAttributes(content, table);
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
