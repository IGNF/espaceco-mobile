import CordovApp from 'cordovapp/CordovApp';
import { wappStorage } from 'cordovapp/cordovapp/CordovApp'
import Report from 'cordovapp/report/ReportForm'
import wapp from '../wapp'
import map from '../map/map'
import GeolocationDraw from 'ol-ext/interaction/GeolocationDraw'
import { toLonLat } from 'ol/proj';
import Audio from 'cordovapp/media/Audio'
import GeolocationCacheRecorder from '../map/interaction/GeolocationCacheRecorder'

import { keepDeviceAwake, allowDeviceSleep } from '../capacitor-hooks/keep-awake';

const bip = new Audio({ source: './sound/bip.mp3' });
const bip2 = new Audio({ source: './sound/bip2.mp3' });
let geolocActive = false;

/* GPS  */
const page = $('#georemGPS');

let paramGPS = wappStorage('gpsTracking') || {
  car: { bxy: true, xy: 0, bz: true, z: 0 },
  ped: { bxy: true, xy: 0, bz: true, z: 0 },
  useCar: true,
  track: []
};

/* The GPS interaction */
let geolocation;
// Pour lire les données bluetooth (ex: nmea) 
//var ble = window.ble;

wapp.ready(() => {
  // On group change, check if direct GPS is enabled
  $('#signalerGPS').hide()
  $(() => {
    $(document).on("changegroup", (e) => {
      $('#signalerGPS').hide();
      //on met un timeout car le setProfil doit d abord avoir ete fait
      setTimeout(() => {
        // SignalerGPS rapide (si thèmes rapides)
        if (wapp.report.param.themes) {
          wapp.report.param.themes.forEach((th) => {
            if (/^GPS@|^Rapide@/.test(th.theme)) $('#signalerGPS').show();
          });
        }
      }, 100);
    });
  });

  // Interaction
  if (!wapp.interactions) wapp.interactions = {};
  wapp.interactions.reportGeolocation = geolocation = new GeolocationDraw({
    // source: options.source,
    minZoom: 17,
    followTrack: 'auto',
    tolerance: (wapp.param.options ? wapp.param.options.toleranceGPS || 0 : 5),
    minAccuracy: (wapp.param.options ? wapp.param.options.minGPSAccuracy || 20 : 20)
  });
  GeolocationCacheRecorder.saveDraw(geolocation, startTracking);
  // Add nmea informations
  geolocation.getPosition = function (loc) {
    var pos = loc.getPosition();
    pos.push(Math.round((loc.getAltitude() || 0) * 100) / 100);
    pos.push(Math.round((new Date()).getTime() / 1000));

    //TODO à tester avec GPS externe
      // ble.read(deviceId, '0x180F', '0x2A19', 
      // function(data) {
      //   var batteryLevel = new Uint8Array(data)[0];
      //   console.log('Batterie: ' + batteryLevel + '%');
      //   }
      // );
    
    if (loc._position.nmea) {
      // Show icones
      $('.info', page).show();
      pos.push(loc._position.nmea.geoidal);
      //$('.sats', page).html(loc._position.nmea.satsVisible+'/'+loc._position.nmea.satellites);
      // Deprecated
      //TODO fonction pour changer de couleur selon le résultat
      $('.sats', page).html(loc._position.nmea.quality); //GGA - fix qualification (null si non valide, 'fix' pour valid SPS fix, 'dgps-fix' pour valid DGPS fix)
      $('.speed', page).html(((loc._position.coords.speed * 3600 / 1000) || '-') + ' km/h');
      $('.pdop', page).html(loc._position.nmea.pdop);
      //TODO 
      //$('.batt', page).html(batteryLevel + '%');
      $('.batt', page).html('%');
    } else {
      // Hide icones
      $('.info', page).hide();
    }
    return pos;
  }
  geolocation.on('change:active', () => {
    var param = getDeport();
    if (param.tolerance === undefined) param.tolerance = wapp.param.options.toleranceGPS;
    geolocation.set('tolerance', param.tolerance);
  });
  // Prevent from falling asleep when geolocating
  geolocation.on('change:active', (e) => {
    if (e.target.getActive()) keepDeviceAwake();
    else allowDeviceSleep();
  });
  // Drawing
  geolocation.on('drawing', (e) => {
    if (page.hasClass('track')) {
      bip.play();
    } else if (e.feature && e.feature.getGeometry()) {
      e.feature.getGeometry().setCoordinates([]);
    }
  });
  geolocation.on('drawend', saveTracking);
  geolocation.setActive(false);
  map.addInteraction(geolocation);

  // Handle Page
  $('.caret', page).click(() => {
    page.toggleClass('small');
  });
  // Start recording
  $('.fa-circle', page).click(startTracking);
  // Pause recording
  $('.fa-pause', page).click(pauseTracking);
  // Valid track
  $('.fa-check', page).click(endTracking);
  // Valid track
  $('.fa-step-forward', page).click(nextTrack)
  // Stop and return
  $('.fa-times', page).click(stopTracking);
  // Stop and start again
  $('.fa-map-marker', page).click(() => {
    stopTracking(false, 'choice');
  });
  // Car / pedestrian
  $('.fa-car', page).click(() => {
    page.removeClass('car');
    paramGPS.useCar = false;
    wappStorage('gpsTracking', paramGPS);
    geolocation.set('tolerance', getDeport().tolerance || 0);
  });
  $('.fa-male', page).click(() => {
    page.addClass('car');
    paramGPS.useCar = true;
    wappStorage('gpsTracking', paramGPS);
    geolocation.set('tolerance', getDeport().tolerance || 0);
  });
  // Deport
  $('.fa-arrows', page).click(() => {
    setDeport(page.hasClass('car'));
  });
  // Sound
  var sound = $('.fa-volume-up', page).click(() => {
    if (bip.getVolume()) {
      bip.setVolume(0);
      bip2.setVolume(0);
      sound.addClass('off');
    } else {
      bip.setVolume(1);
      bip2.setVolume(1);
      sound.removeClass('off');
    }
  });
});

/** Modify deport */
function setDeport(isCar) {
  var template = CordovApp.template('dialog-deport');
  let param;
  if (isCar) {
    param = paramGPS.car;
  } else {
    $('.car', template).hide();
    param = paramGPS.ped;
  }
  // Plani
  $('.XY input[type="checkbox"]', template)
    .prop('checked', param.bxy)
    .on('change', function () {
      $('.XY input[type="number"]', template).prop('disabled', !$(this).prop('checked'));
    });
  $('.XY input[type="number"]', template).val(param.xy || 0).prop('disabled', !param.bxy);
  // Alti
  $('.Z input[type="checkbox"]', template)
    .prop('checked', param.bz)
    .on('change', function () {
      $('.Z input[type="number"]', template).prop('disabled', !$(this).prop('checked'));
    });
  $('.Z input[type="number"]', template).val(param.z || 0).prop('disabled', !param.bz);
  $('.tolerance input[type="number"]', template).val(param.tolerance || 0);
  // Dialog
  wapp.dialog.show(template, {
    buttons: { submit: 'ok', cancel: 'annuler' },
    callback: (b) => {
      if (b === 'submit') {
        param.bxy = $('.XY input[type="checkbox"]', template).prop('checked');
        param.xy = parseFloat($('.XY input[type="number"]', template).val());
        param.bz = $('.Z input[type="checkbox"]', template).prop('checked');
        param.z = parseFloat($('.Z input[type="number"]', template).val());
        param.tolerance = parseFloat($('.tolerance input[type="number"]', template).val());
        wappStorage('gpsTracking', paramGPS);
        geolocation.set('tolerance', getDeport().tolerance || 0);
      }
    }
  });
}

/* Get current deport */
function getDeport() {
  if (paramGPS.useCar) {
    return paramGPS.car
  } else {
    return paramGPS.ped
  }
}

/* Current georem */
let currentRem;

/** Georem GPS */
Report.prototype.georemGPS = function (georem) {
  //  console.log(georem)
  currentRem = georem;
  wapp.showPage('georemGPS');
  $('#georemGPS p.theme').text(georem.theme);
  //  page.show();
  page.removeClass('track');
  page.removeClass('car');
  if (paramGPS.useCar) {
    page.addClass('car');
  } else {
    page.removeClass('car');
  }
  // start
  geolocActive = wapp.interactions.geolocation.getActive();
  wapp.interactions.geolocation.setActive(false);
  wapp.select.setActive(false);
  geolocation.set('minAccuracy', wapp.param.options.minGPSAccuracy);
  geolocation.setActive(true);
};

/** Save current tracking
 * @param {*} e tracking event
 */
function saveTracking(e) {
  // save if is tracking
  if (page.hasClass('track')) {
    bip.stop();
    bip2.play();
    const feature = e.feature;
    if (feature.getGeometry()) {
      const deport = getDeport();
      if (deport.bxy) feature.set('deportXY', deport.xy);
      if (deport.bz) feature.set('deportZ', deport.z);
      const grem = $.extend({}, currentRem);
      const pt = toLonLat(feature.getGeometry().getFirstCoordinate());
      grem.lon = pt[0];
      grem.lat = pt[1];
      // Add last point
      const lastPt = geolocation.geolocation.getPosition();
      const lastTrackPt = geolocation.path_[geolocation.path_.length - 1];
      if (lastPt[0] !== lastTrackPt[0] && lastPt[1] !== lastTrackPt[1]) {
        geolocation.path_.push(lastPt);
        feature.getGeometry().appendCoordinate(lastPt);
      }
      // Nettoyage des NaN
      let coords = feature.getGeometry().getCoordinates();
      for (let i = coords.length - 1; i >= 0; i--) {
        if (
          (isNaN(coords[i][0]) || isNaN(coords[i][1])
            || !coords[i][0] || !coords[i][1])
        ) {
          coords.splice(i, 1);
        }
      }
      feature.getGeometry().setCoordinates(coords);

      // Save GPS track (with nmea info)
      if (geolocation.path_[0] && geolocation.path_[0][4] !== undefined) {
        const nmea = [];
        geolocation.path_.forEach((c) => {
          nmea.push([c[3], c[4]]);
        })
        feature.set('nmea', nmea);
      }
      grem.sketch = wapp.report.feature2sketch(feature, map.getView().getProjection());
      wapp.report.saveLocalRem(grem, null, (e) => {
        if (e.error) console.error(e.error);
      });
    }
  }
}

/** Start recording track
 */
function startTracking() {
  geolocation.setActive(false);
  page.addClass('track');
  $('.fa-pause').removeClass('fa-circle');
  geolocation.setActive(true);
  geolocation.setFollowTrack('auto');
}

/** Pause recording track
 */
function pauseTracking() {
  if (geolocation.isPaused()) {
    geolocation.pause(false);
    $('.fa-pause').removeClass('fa-circle');
  } else {
    geolocation.pause(true);
    $('.fa-pause').addClass('fa-circle');
  }
  geolocation.setFollowTrack('auto');
}

/** Stop recording track
 */
function endTracking() {
  // Stop
  geolocation.setActive(false);
  page.removeClass('track');
  geolocation.setActive(true);
}

/** Next track: save track and start a new one from end point
 */
function nextTrack() {
  // En track and start a new one
  const pt = geolocation.path_[geolocation.path_.length - 1];
  // endTracking();
  // Start new
  startTracking();
  // Start point = last point
  if (pt) geolocation.path_.push(pt);
}

/** Stop recording and back to map 
 * @param {boolean} force true to stop without dialog
 * @param {boolean} again true to start new theme
 */
function stopTracking(force, again) {
  if (force !== true && page.hasClass('track')) {
    wapp.message(
      'Voullez-vous interrompre la saisie ?<br/><i class="fa fa-warning fa-lg0 fa-fleft"></i> La saisie ne sera pas enregistrée...',
      'Trace en cours...',
      { ok: 'Interrompre', cancel: 'Continuer' },
      (b) => {
        if (b === 'ok') {
          page.removeClass('track');
          stopTracking(true, again || true);
        }
      }
    );
    return;
  }
  geolocation.setActive(false);
  wapp.select.setActive(true);
  page.removeClass('track');
  if (!again) {
    page.removeClass('track');
    wapp.hidePage();
    if (geolocActive) {
      // Restart GPS tracking
      wapp.interactions.geolocation.setActive(true);
      wapp.interactions.geolocation.pause(true);
    }
  } else if (again === 'choice') {
    wapp.directGPS();
  }
}

/** Saisie direct GPS (sans dialogue) */
function startDirectGPS(c, theme) {
  var center = wapp.map.getView().getCenter();
  let pos = toLonLat(center, wapp.map.getView().getProjection(), 'EPSG:4326');
  let wkt = "POINT(" + pos[0] + " " + pos[1] + ")";
  var georem = {
    attText: '',
    attributes: '',
    comment: 'Signalement GPS rapide.',
    community_id: wapp.userManager.param.active_community,
    geometry: wkt,
    photo: false,
    protocol: '_MONGUICHET_65876',
    theme: theme.theme,
    themes: c,
    version: "0.1",
  }
  let attributes = {};
  theme.attributes.forEach((a) => {
    if (a.default) {
      attributes[a.name] = a.default;
    }
  })
  georem.attributes = JSON.stringify(attributes);
  // Start 
  wapp.report.georemGPS(georem);
}

/** Choix du groupe pour un signelement direct GPS */
wapp.directGPS = function () {
  var choix = {};
  var themes = {};
  var nb = 0;
  let community_id = wapp.report.param.profil.community_id;
  wapp.report.param.themes.forEach((th) => {
    if (/^GPS@|^Rapide@/.test(th.theme)) {
      choix[community_id + "::" + th.theme] = th.theme;
      themes[community_id + "::" + th.theme] = th;
      nb++;
    }
  });
  if (nb > 1) {
    wapp.selectDialog(choix, null, (c) => {
      startDirectGPS(c, themes[c]);
    }, {
      buttons: { other: "Autres", cancel: "annuler" },
      callback: (b) => {
        if (b === 'other') {
          wapp.report.showFormulaire('gps');
        }
      }
    });
  } else if (nb === 1) {
    var c = Object.keys(choix)[0];
    startDirectGPS(c, themes[c]);
  } else {
    console.warn('NO rapide')
  }
}

export { geolocation }
export default Report
