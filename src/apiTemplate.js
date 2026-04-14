/** Fonctionnalites utilisees dans les templates */
import wapp from './wapp'
import CordovApp from 'cordovapp/CordovApp'
import { transform } from 'ol/proj';

import { getDeviceOs } from './capacitor-hooks/device-helper'
import { AppLauncher } from '@capacitor/app-launcher'

/** Select external GPS
 */
wapp.selectGPS = function () {
  // var menu = $('#options .sourcegps div').html(internal);
  wapp.selectDialog({
    internal: 'GPS interne',
    external: 'GPS externe (bluetooth)'
  },
    null,
    (source) => {
      wapp.param.gpsSource = 'internal';

      navigator.geolocation.setSource(source,
        (e) => {
          if (e.type === 'external') {
            $('#options .sourcegps div').html('GPS externe (' + e.name + ')');
          } else {
            $('#options .sourcegps div').html('GPS interne');
          }
          wapp.param.gpsSource = e.type;
        },
        () => {
          wapp.alert('Impossible de se connecter au GPS externe.<br/>Vérifiez que le bluetooth est bien activé et le GPS allumé...');
        });
    }, {
    title: 'Sélectionner la source GPS'
  }
  );
};

/** 
 * Cloner le signalement
 */
wapp.cloneGeorem = function () {
  if (wapp.select.getFeatures().array_.length != 1) {
    wapp.alert("Sélectionner une seule alerte");
    return;
  }
  let featureGeorem = wapp.select.getFeatures().array_[0];

  let georem = null;
  let attributes = "";
  let themes = "";
  let theme = "";

  if (undefined != featureGeorem.values_.report) {
    //on formate les donnees pour une alerte chargee depuis l api
    georem = featureGeorem.values_.report;

    if (georem.attributes.length > 1) {
      wapp.alert("Impossible de cloner une alerte comportant plusieurs thèmes.");
      return;
    }

    let idGroup = georem.attributes[0].community
    theme = georem.attributes[0].theme;
    themes = `${idGroup}::${theme}`;
    attributes = JSON.stringify(georem.attributes[0].attributes);
  } else if (undefined != featureGeorem.values_.georem) {
    //on formate les donnees pour une alerte cree depuis l appli
    georem = featureGeorem.values_.georem;

    theme = georem.theme;
    if (!theme && typeof georem.attributes[0].theme != undefined) {
      theme = georem.attributes[0].theme;
      themes = `${georem.attributes[0].community_id}::${theme}`;
    } else {
      themes = georem.themes;
    }
    attributes = georem.attributes;
  } else {
    wapp.alert("Sélectionner une alerte");
    return;
  }

  let p = transform(wapp.map.getView().getCenter(), wapp.map.getView().getProjection(), 'EPSG:4326');
  let wkt = "POINT(" + p[0] + " " + p[1] + ")";

  let clone = {
    geometry: wkt,
    sketch: undefined,
    comment: georem.comment ? georem.comment : "",
    photo: false,
    community: georem.community,
    themes: themes,
    theme: theme,
    attributes: attributes,
    attText: georem.attText
  };

  wapp.report.saveLocalRem(clone, null, (e) => {
    if (e.error) {
      wapp.notification(e.info);
      return;
    }
    wapp.notification("Le signalement a bien été cloné");
    wapp.report.dispatchEvent({
      type: 'select',
      georem: clone,
      add: true
    });
    wapp.modifyGeorem();
  });
}

/** Afficher la legende
 */
wapp.showLegend = function () {
  wapp.dialog.show(CordovApp.template('dialog-legend'), {
    className: 'legend',
    anim: !wapp.hasDialog(),
    closeBox: true
  })
};

/** Filtrage des signalement
 */
wapp.filterGeorem = function () {
  wapp.showPage('filter');
};

/** Toggle layer Guichet
 */
wapp.toggleLayerGuichet = function (elt) {
  const guichet = wapp.getLayerGuichet()
  guichet.setVisible(!guichet.getVisible());
  if (guichet.getVisible()) $('i', elt).removeClass('fa-eye-slash');
  else $('i', elt).addClass('fa-eye-slash');
}

/** Goto location using external app
 */
wapp.goto = function () {
  wapp.saveContext();
  let where = wapp.map.getView().getCenter();
  // Center on selection
  const feature = wapp.select.getFeatures().item(0);
  if (feature) {
    if (!feature.getGeometry().intersectsCoordinate(where)) {
      where = feature.getGeometry().getClosestPoint(where);
    }
  }
  // Get LonLat
  where = transform(where, wapp.map.getView().getProjection(), 'EPSG:4326');
  // Goto
  setTimeout(() => { //pour donner le temps au contexte de s'enregistrer
    const url = getDeviceOs() === 'ios' ? 'maps://?q=' + where[1] + ',' + where[0] : 'geo://0,0?q=' + where[1] + ',' + where[0]
    AppLauncher.openUrl({ url: url })
  }, 800)

}