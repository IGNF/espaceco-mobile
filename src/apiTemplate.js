/*global bluetoothSerial*/
/** Fonctionnalites utilisees dans les templates */
import wapp from './wapp'
import CordovApp from '../cordovapp/CordovApp'

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

/** Toggle layer Guichet */
wapp.toggleLayerGuichet = function (elt) {
  const guichet = wapp.getLayerGuichet()
  guichet.setVisible(!guichet.getVisible());
  if (guichet.getVisible()) $('i', elt).removeClass('fa-eye-slash');
  else $('i', elt).addClass('fa-eye-slash');
}