/*global bluetoothSerial*/
/** Fonctionnalites utilisees dans les templates */
import wapp from './wapp'
import CordovApp from 'cordovapp/CordovApp'
import { transform } from 'ol/proj';

/** Select external GPS
 */
wapp.selectGPS = function() {
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
            $('#options .sourcegps div').html('GPS externe ('+e.name+')');
          }
          wapp.param.gpsSource = e.type;
        }, 
        () => {
          wapp.alert('Impossible de se connecter au GPS externe.<br/>Vérifiez que le bluetooth est bien activé et le GPS allumé...');
        });
    },{
      title: 'Sélectionner la source GPS'
    }
  );
  if (window.bluetoothSerial && !bluetoothSerial.isok) {
    bluetoothSerial.isok = true;
    const con = bluetoothSerial.connect;
    bluetoothSerial.connect = function (macAddress_or_uuid, connectSuccess, connectFailure) {
      var tout = setTimeout(() => { wapp.wait('Recherche du GPS'); }, 500);
      con.call(bluetoothSerial, macAddress_or_uuid, 
        (a) => {
          clearTimeout(tout);
          wapp.wait(false);
          connectSuccess(a); 
        }, () => { 
          clearTimeout(tout);
          wapp.wait(false);
          wapp.alert('Impossible de se connecter au GPS.');
          connectFailure();
        }
      );
    }
  }
};

/** Cloner le signalement 
 */
wapp.cloneGeorem = function() {
  if (wapp.select.getFeatures().array_.length != 1) {
    wapp.alert("Sélectionner une seule alerte");
    return;
  }
  let featureGeorem = wapp.select.getFeatures().array_[0];

  let georem = null;
  let attributes = "";
  let themes = "";
  let theme = "";

  if (undefined != featureGeorem.values_.ripart) {
    //on formate les donnees pour une alerte chargee depuis l api
    georem = featureGeorem.values_.ripart;

    if (georem.themes.length > 1) {
      wapp.alert("Impossible de cloner une alerte comportant plusieurs thèmes.");
      return;
    }

    let idGroup = georem.themes[0].community_id
    theme = georem.themes[0].theme;
    themes = `${idGroup}::${theme}=>"1"`;
    let originalAttributes = georem.themes[0].attributes;
    for (var key in originalAttributes) {
      attributes += `,"${idGroup}::${theme}::${key}"=>"${originalAttributes[key]}"`;
    }
  } else if (undefined != featureGeorem.values_.georem) {
    //on formate les donnees pour une alerte cree depuis l appli
    georem = featureGeorem.values_.georem;

    theme = georem.theme;
    if (!theme && typeof georem.themes[0].theme != undefined){
      theme = georem.themes[0].theme;
      themes = `${georem.themes[0].community_id}::${theme}=>"1"`;
    } else {
      themes = georem.themes;
    }
    
    attributes = georem.attributes;
  } else {
    wapp.alert("Sélectionner une alerte");
    return;
  }
  
  let coord = wapp.map.getView().getCenter();
  let lonlat = transform(coord, wapp.map.getView().getProjection(), 'EPSG:4326');

  let clone =  {
    lon: lonlat[0], 
    lat: lonlat[1], 
    sketch: undefined,
    comment: georem.comment ? georem.comment : "",
    photo: false,
    community_id: georem.community_id,
    themes: themes,
    theme: theme,
    attributes: attributes,
    attText : georem.attText
  };

  wapp.ripart.saveLocalRem(clone, null, (e) => {
    if (e.error) {
      wapp.notification(e.info);
      return;
    }
    wapp.notification("Le signalement a bien été cloné");
    wapp.ripart.dispatchEvent({
      type: 'select',
      georem: clone,
      add: true
    });
    wapp.modifyGeorem();
  });
}

/** Afficher la legende
 */
wapp.showLegend = function() {
  wapp.dialog.show( CordovApp.template('dialog-legend'), { 
    className: 'legend', 
    anim: !wapp.hasDialog(), 
    closeBox: true 
  })
};

/** Filtrage des signalement
 */
wapp.filterGeorem = function() {
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
wapp.goto = function() {
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
  if (wapp.getPlatformId()==='ios') window.cordova.InAppBrowser.open('maps://?q='+where[1]+','+where[0], '_system');
  else window.open('geo://0,0?q='+where[1]+','+where[0], '_system');
}