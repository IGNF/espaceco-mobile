/**
 * BLE GPS — connexion GPS externe via Bluetooth Low Energy + parsing NMEA
 *
 * Remplace cordova-plugin-bluetooth-geolocation (bluetoothSerial + gps.js) par :
 *  - @capacitor-community/bluetooth-le  → connexion BLE
 *  - nmea-simple                        → parsing NMEA 4.11 complet
 *
 * Ce module monkey-patche navigator.geolocation.setSource('external')
 * afin que tout watchPosition reçoive des fake-Position construites depuis
 * les trames NMEA du GPS BLE, compatibles avec la structure attendue par
 * ol/Geolocation, interaction.js (_position.nmea, _position.source) et georemGPS.js.
 *
 * UUIDs par défaut : Nordic UART Service (NUS), le plus répandu sur les GPS BLE.
 * Remplacer NUS_SERVICE / NUS_TX_CHAR si votre récepteur utilise un service propriétaire.
 */

import { BleClient, dataViewToText } from '@capacitor-community/bluetooth-le';
import { parseNmeaSentence } from 'nmea-simple';

// ─────────────────────────────────────────────
// UUIDs BLE — Nordic UART Service (NUS)
// ─────────────────────────────────────────────
/** Service NMEA : Nordic UART Service */
export const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
/** Caractéristique TX (données NMEA envoyées par le récepteur) */
export const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
/** Service GATT Battery */
export const BATT_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
/** Caractéristique Battery Level */
export const BATT_CHAR    = '00002a19-0000-1000-8000-00805f9b34fb';

// ─────────────────────────────────────────────
// Mapping qualité : nmea-simple → convention gps.js (utilisée dans georemGPS.js)
// ─────────────────────────────────────────────
const QUALITY_MAP = {
  'gps-fix':   'fix',
  'dgps-fix':  'dgps-fix',
  'pps-fix':   'pps-fix',
  'rtk':       'rtk',
  'float-rtk': 'rtk-float',
  'estimated': 'estimated',
  'manual':    'manual',
  'simulated': 'simulated',
};

// ─────────────────────────────────────────────
// État interne
// ─────────────────────────────────────────────
let gpsState     = {};
let nmeaBuffer = '';
export function getNmeaBuffer() { return nmeaBuffer; }
let currentDevice = null;
let watchCallbacks = {};   // id → successCallback
let batteryCallback = null;
let batteryTimer    = null;
let bleInitialized  = false;

// ─────────────────────────────────────────────
// Parsing NMEA
// ─────────────────────────────────────────────

/** Accumule les chunks BLE (fragments de phrases NMEA) et traite les lignes complètes. */
function onNmeaChunk(chunk) {
  nmeaBuffer += chunk;
  const lines = nmeaBuffer.split(/\r?\n/);
  nmeaBuffer = lines.pop();   // dernière ligne potentiellement incomplète

  for (const line of lines) {
    if (!line.startsWith('$')) continue;
    try {
      const sentence = parseNmeaSentence(line);
      processSentence(sentence);
    } catch (_) {
      // phrase NMEA inconnue ou malformée — ignorée (ex. type NMEA 4.11 non supporté)
    }
  }
}

/** Met à jour l'état GPS accumulé et déclenche les callbacks watchPosition sur GGA/RMC. */
function processSentence(s) {
  const id = s.sentenceId;

  if (id === 'GGA' && s.fixType && s.fixType !== 'invalid') {
    gpsState.lat        = s.latitude;
    gpsState.lon        = s.longitude;
    gpsState.alt        = s.altitudeMeters;
    gpsState.hdop       = s.horizontalDilution;
    gpsState.geoidal    = s.geoidalSeparation;
    gpsState.quality    = QUALITY_MAP[s.fixType] ?? null;
    gpsState.satellites = s.satellitesInView;
    gpsState.time       = s.datetime;
    gpsState.lastFix    = Date.now();

  } else if (id === 'RMC' && s.status === 'valid') {
    gpsState.lat     = s.latitude;
    gpsState.lon     = s.longitude;
    gpsState.speed   = s.speedKnots;   // nœuds → converti en m/s dans buildPosition
    gpsState.heading = s.trackTrue;
    gpsState.time    = s.datetime;
    gpsState.variation = s.variation;
    gpsState.variationPole = s.variationPole;
    gpsState.lastFix = Date.now();

  } else if (id === 'GSA') {
    gpsState.pdop       = s.PDOP;
    gpsState.hdop       = s.HDOP;
    gpsState.vdop       = s.VDOP;
    gpsState.selectionMode = s.selectionMode;
    gpsState.fixMode    = s.fixMode;
    gpsState.satsActive = s.satellites || [];

  } else if (id === 'GSV') {
    // Accumulation multi-messages : réinitialisation au premier message du cycle
    gpsState.numberOfMessages = s.numberOfMessages;
    gpsState.satellitesInView = s.satellitesInView;
    if (s.messageNumber === 1) gpsState._gsvTmp = [];
    if (s.satellites) gpsState._gsvTmp = (gpsState._gsvTmp || []).concat(s.satellites);
    if (s.messageNumber === s.totalMessages) gpsState.satsVisible = gpsState._gsvTmp;
  }

  gpsState.lastSentence = s;

  // Déclenchement sur GGA ou RMC uniquement (position valide disponible)
  if ((id === 'GGA' || id === 'RMC') && gpsState.lat && gpsState.lon && gpsState.time) {
    triggerWatchCallbacks();
  }
}

// ─────────────────────────────────────────────
// Construction de la fake-Position
// ─────────────────────────────────────────────

/**
 * Construit un objet Position compatible avec la structure attendue par :
 *  - ol/Geolocation.positionChange_ (coords standard)
 *  - src/map/interaction.js (this._position = position → loc._position)
 *  - georemGPS.js (loc._position.source, loc._position.nmea)
 */
function buildPosition() {
  const speedMs    = gpsState.speed != null ? gpsState.speed * 0.514444 : null;
  const identifier = currentDevice
    ? `${currentDevice.name || currentDevice.deviceId} (${currentDevice.deviceId})`
    : 'External BLE GPS';

  const position = {
    coords: {
      latitude:         gpsState.lat,
      longitude:        gpsState.lon,
      altitude:         gpsState.alt ?? null,
      accuracy:         gpsState.hdop != null ? gpsState.hdop * 4 : null,
      altitudeAccuracy: gpsState.vdop != null ? gpsState.vdop * 4 : null,
      heading:          gpsState.heading ?? NaN,
      speed:            speedMs,
    },
    timestamp: gpsState.time ? gpsState.time.getTime() : Date.now(),
  };

  /** Champ custom lu par src/map/interaction.js via this._position = position */
  position.source = {
    type:        'external',
    typeIsGuess: false,
    identifier,
  };

  /** Champ custom lu par georemGPS.js via loc._position.nmea */
  position.nmea = {
    geoidal:     gpsState.geoidal    ?? null,
    pdop:        gpsState.pdop       ?? null,
    hdop:        gpsState.hdop       ?? null,
    vdop:        gpsState.vdop       ?? null,
    quality:     gpsState.quality    ?? null,   // 'fix', 'dgps-fix', 'rtk'…
    satellites:  gpsState.satellites ?? null,
    satsActive:  gpsState.satsActive  ? gpsState.satsActive.length  : 0,
    satsVisible: gpsState.satsVisible ? gpsState.satsVisible.length : 0,
    type:        gpsState.lastSentence ? gpsState.lastSentence.sentenceId : null,
    valid:       true,
    /** Objet sentence complet issu de nmea-simple (tous les champs parsés + raw disponibles) */
    data:        gpsState.lastSentence ?? null,
  };

  return position;
}

function triggerWatchCallbacks() {
  const position = buildPosition();
  Object.values(watchCallbacks).forEach(cb => {
    try { cb(position); } catch (e) { console.error('[ble-gps] watchPosition callback error', e); }
  });
}

// ─────────────────────────────────────────────
// Batterie
// ─────────────────────────────────────────────

/**
 * Enregistre un callback appelé avec le niveau de batterie (0-100) à chaque lecture.
 * @param {function(number):void} cb
 */
export function setBatteryCallback(cb) {
  batteryCallback = cb;
}

async function readBattery() {
  if (!currentDevice) return;
  try {
    const value = await BleClient.read(currentDevice.deviceId, BATT_SERVICE, BATT_CHAR);
    const level = new Uint8Array(value.buffer)[0];
    if (batteryCallback) batteryCallback(level);
  } catch (e) {
    console.warn('[ble-gps] Lecture batterie échouée :', e);
  }
}

// ─────────────────────────────────────────────
// Gestion des modes GPS (interne / externe BLE)
// ─────────────────────────────────────────────

/** Restitue le mode GPS interne en déléguant au plugin Cordova. */
function restoreInternalMode(cordovaSetSource, onSuccess, onError) {
  // Nettoyer la connexion BLE courante
  if (batteryTimer) { clearInterval(batteryTimer); batteryTimer = null; }
  if (currentDevice) {
    BleClient.stopNotifications(currentDevice.deviceId, NUS_SERVICE, NUS_TX_CHAR).catch(() => {});
    BleClient.disconnect(currentDevice.deviceId).catch(() => {});
    currentDevice = null;
  }
  watchCallbacks = {};
  gpsState       = {};
  nmeaBuffer     = '';

  // Déléguer au plugin Cordova pour restaurer ses méthodes watchPosition/getCurrentPosition
  if (typeof cordovaSetSource === 'function') {
    cordovaSetSource.call(navigator.geolocation, 'internal', onSuccess, onError);
  } else {
    onSuccess && onSuccess({ type: 'internal' });
  }
}

/** Connecte le GPS BLE et injecte les positions dans navigator.geolocation. */
async function setExternalMode(onSuccess, onError) {
  try {
    if (!bleInitialized) {
      await BleClient.initialize({ androidNeverForLocation: false });
      bleInitialized = true;
    }

    // Sélecteur de périphérique natif OS (remplace listpicker / cordova-plugin-bluetooth-serial)
    const device = await BleClient.requestDevice({ services: [NUS_SERVICE] });
    currentDevice = device;

    await BleClient.connect(device.deviceId, (disconnectedId) => {
      console.warn('[ble-gps] GPS BLE déconnecté :', disconnectedId);
      currentDevice = null;
      if (batteryTimer) { clearInterval(batteryTimer); batteryTimer = null; }
    });

    // Abonnement aux trames NMEA (Nordic UART Service — TX characteristic)
    await BleClient.startNotifications(device.deviceId, NUS_SERVICE, NUS_TX_CHAR, (value) => {
      onNmeaChunk(dataViewToText(value));
    });

    // Batterie : lecture initiale + polling toutes les 60 s
    readBattery();
    batteryTimer = setInterval(readBattery, 60000);

    // ── Remplacement des méthodes navigator.geolocation ──────────────────────
    // ol/Geolocation appellera watchPosition → notre version stocke le callback.
    // processSentence() l'appellera avec une fake-Position à chaque trame GGA/RMC.
    navigator.geolocation.watchPosition = function(success /*, error, opts — non utilisés */) {
      const id = Math.random().toString(36).slice(2);
      watchCallbacks[id] = success;
      return id;
    };
    navigator.geolocation.clearWatch = function(id) {
      delete watchCallbacks[id];
    };
    navigator.geolocation.getCurrentPosition = function(success, error, opts) {
      const id = navigator.geolocation.watchPosition((pos) => {
        navigator.geolocation.clearWatch(id);
        success(pos);
      }, error, opts);
    };

    onSuccess && onSuccess({
      type:       'external',
      identifier: `${device.name || device.deviceId} (${device.deviceId})`,
      name:       device.name || device.deviceId,
      id:         device.deviceId,
    });

  } catch (e) {
    console.error('[ble-gps] Connexion BLE GPS échouée :', e);
    // Nettoyage partiel si connexion échouée
    currentDevice = null;
    onError && onError(e.message || String(e));
  }
}

// ─────────────────────────────────────────────
// Override de navigator.geolocation.setSource
// S'enregistre après deviceready pour être sûr que le plugin Cordova a déjà initialisé.
// ─────────────────────────────────────────────
document.addEventListener('deviceready', () => {
  // Le plugin cordova-plugin-bluetooth-geolocation a déjà défini setSource
  // (mode internal = GPS natif, mode external = bluetoothSerial)
  // On remplace uniquement le mode external par notre implémentation BLE.
  const cordovaSetSource = navigator.geolocation.setSource;

  navigator.geolocation.hasSource    = true;
  navigator.geolocation.canSetSource = true;

  navigator.geolocation.setSource = function(source, onSuccess, onError) {
    if (source === 'external') {
      setExternalMode(onSuccess, onError);
    } else {
      restoreInternalMode(cordovaSetSource, onSuccess, onError);
    }
  };
}, false);  
