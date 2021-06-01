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
      navigator.geolocation.setSource(source,
        (e) => {
          if (e.type === 'external') {
            $('#options .sourcegps div').html('GPS externe ('+e.name+')');
          }
        }, 
        () => {
          wapp.alert('Impossible de se connecter au GPS externe.<br/>Vérifiez que le bluetooth est bien activé et le GPS allumé...');
        });
    },{
      title: 'Sélectionner la source'
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
  if (wapp.getPlatformId()==='ios') cordova.InAppBrowser.open('maps://?q='+where[1]+','+where[0], '_system');
  else window.open('geo://0,0?q='+where[1]+','+where[0], '_system');
}