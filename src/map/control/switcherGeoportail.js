import CordovApp from 'cordovapp/CordovApp'
import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'
import 'ol-ext/layer/GetPreview'


let geoportailSwitcher;


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
    if (e.layer.get('desc')) {
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
