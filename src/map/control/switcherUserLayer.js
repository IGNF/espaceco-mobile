import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'


export default function(wapp) {
  $('#layer-carte').on('showpage', () => {
    var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
    if (lgroup.getLayers().getLength()) {
      $('#layer-carte').addClass('hascarte');
    } else {
      $('#layer-carte').removeClass('hascarte');
    }
  });
  const userlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-carte .layerswitcher").get(0), 
    reordering: true,
    layerGroup: wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' })
  });
  userlayerSwitcher.on('drawlist', (e) => {
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        var content = CordovApp.template('dialog-infocarte');
        wapp.dataAttributes(content, e.layer.getProperties());
        console.log( e.layer.getProperties())
        wapp.dialog.show (content, {
          buttons: { ok:'ok' }
        });
      },
      parent: div
    });
  });

  return userlayerSwitcher;
};