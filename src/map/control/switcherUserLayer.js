import CordovApp from 'cordovapp/CordovApp'
import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'
import { removeUserLayer } from '../../guichet/userLayers';

export default function(wapp) {
  $('#layer-carte').on('showpage', () => {
    var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
    if (lgroup.getLayers().getLength()) {
      $('#layer-carte').addClass('hascarte');
    } else {
      $('#layer-carte').removeClass('hascarte');
    }
  });

  // Show / hide layer
  const layer = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
  const eye = $('#couches .usermap .fa-eye').on('click', (e) => {
    e.stopPropagation();
    layer.setVisible(!layer.getVisible());
  });
  const eye2 = $('#layer-carte h3 .fa-eye').on('click', () => {
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

  const userlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-carte .layerswitcher").get(0), 
    reordering: true,
    layerGroup: layer
  });
  userlayerSwitcher.on('layer:visible', () => {
    let vis = false;
    layer.getLayers().forEach((l)=> {
      vis = vis || l.getVisible();
    })
    layer.setVisible(vis);
  })
  
  userlayerSwitcher.on('drawlist', (e) => {
    const layer = e.layer;
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // Supression
    if (layer.get('type')!=='CollabVector') {
      ol_ext_element.create('I', {
        className: 'fa fa-trash-o',
        click: () => {
          wapp.dialog.show ('Voulez-vous vraiment supprimer ce calque ?', {
            buttons: { ok:'ok', cancel: 'annuler' },
            callback: (b) => {
              if (b==='ok') removeUserLayer(layer);
            }
          });
        },
        parent: div
      });
    }
    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        var content = CordovApp.template('dialog-infocarte');
        wapp.dataAttributes(content, layer.getProperties());
        console.log(layer.getProperties())
        wapp.dialog.show (content, {
          buttons: { ok:'ok' }
        });
      },
      parent: div
    });
  });

  return userlayerSwitcher;
}