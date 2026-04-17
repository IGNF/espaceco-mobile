/**
 * BLE GPS — connexion GPS externe via Bluetooth Low Energy + parsing NMEA
 *
 */

import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { Geolocation } from '@capacitor/geolocation';
import { parseNmeaSentence } from 'nmea-simple';

/** Préfixes de noms des récepteurs GPS Bluetooth Classic reconnus */
const GPS_PREFIXES = ['GPS', 'Geo', 'GEO', '160'];

const QUALITY_MAP = {
  'fix':      'fix', //fix GPS standard, 2D ou 3D
  'gps-fix':   'fix', //fix GPS standard, 2D ou 3D
  'dgps-fix':  'dgps-fix', // fix différentiel (DGPS) avec correction en temps réel
  'pps-fix':   'pps-fix', // fix avec signal de synchronisation de précision (PPS) pour une meilleure précision temporelle
  'rtk':       'rtk',  // fix cinématique en temps réel (RTK) avec corrections différentielles pour une précision centimétrique
  'float-rtk': 'rtk-float', // fix RTK flottant (précision sub-métrique)
  'estimated': 'estimated', // position estimée (ex. par inertie) sans fix GPS valide
  'manual':    'manual', // position saisie manuellement par l'utilisateur
  'simulated': 'simulated', // mode simulation (ex. pour tests) avec position générée artificiellement
  'delta':     'delta', // navigation à partir d'une position de référence et de deltas (ex. pour GPS sans fil avec trames de déplacement uniquement)

};

let gpsState     = {};
let nmeaBuffer = '';
let currentDevice = null;
let watchCallbacks = {};   // id → successCallback
let batteryCallback = null;
let batteryTimer    = null;
let nmeaListener    = null;
let nmeaParsed = [];
export function getNmeaParsed() { return nmeaParsed; }

/** Fonction de sélection injectée depuis l'extérieur (évite la dépendance circulaire avec wapp) */
let selectDialogFn = null;
/**
 * Injecter une fonction d'affichage de dialog de sélection.
 * @param {function(choices: Object, title: string, onSelect: function): void} fn
 */
export function setSelectDialog(fn) { selectDialogFn = fn; }

/** Fonction d'indicateur de chargement injectée depuis l'extérieur */
let loadingFn = null;
/**
 * Injecter une fonction affichant/masquant un indicateur de chargement.
 * @param {function(boolean): void} fn — appelée avec true pour afficher, false pour masquer
 */
export function setLoadingFn(fn) { loadingFn = fn; }

// Méthodes natives navigator.geolocation sauvegardées au démarrage
let nativeWatchPosition;
let nativeClearWatch;
let nativeGetCurrentPosition;


/** Tente d'extraire le niveau de batterie d'une trame NMEA propriétaire ou d'une réponse AT.
 *  Formats reconnus :
 *  - $GPTXT,...,BAT:75%*XX  ou  battery=75
 *  - AT+CBC → réponse : +CBC: 0,75,4200  (deuxième champ = pourcentage)
 *  - $PGRMT,...  (Garmin propriétaire — le champ voltage est loggé brut)
 */
function tryParseBatteryFromLine(line) {
  if (!batteryCallback) return;
  // Sentence propriétaire $PGSTX : champ 11 (base 1) = niveau de batterie
  // ex. $PGSTX,1,GAU,3,399977.984,,,,,,,75,,*26
  if (line.startsWith('$PGSTX,')) {
    const fields = line.split(',');
    const level = parseInt(fields[11], 10);
    if (!isNaN(level) && level >= 0 && level <= 100) { batteryCallback(level); return; }
  }
  // Réponse AT+CBC : +CBC: 0,75,4200
  const atCbc = line.match(/\+CBC:\s*\d+,\s*(\d+)/);
  if (atCbc) {
    const level = parseInt(atCbc[1], 10);
    if (level >= 0 && level <= 100) { batteryCallback(level); return; }
  }
  // Trames NMEA propriétaires BAT/battery
  const m =
    line.match(/[Bb][Aa][Tt](?:tery)?[=:]\s*(\d+)/)
    || line.match(/\bBAT(?:T)?\b[^,]*,\s*(\d+)/i);
  if (m) {
    const level = parseInt(m[1], 10);
    if (level >= 0 && level <= 100) batteryCallback(level);
  }
}

/** Calcule le checksum XOR NMEA d'une sentence (entre $ et *). */
function calcNmeaChecksum(sentence) {
  const end = sentence.indexOf('*');
  let cs = 0;
  for (let i = 1; i < (end === -1 ? sentence.length : end); i++) {
    cs ^= sentence.charCodeAt(i);
  }
  return cs.toString(16).toUpperCase().padStart(2, '0');
}

/** Retire le dernier champ NMEA et recalcule le checksum (pour sentences NMEA 4.1). */
function stripLastNmeaField(sentence) {
  const starIdx = sentence.lastIndexOf('*');
  if (starIdx === -1) return null;
  const body = sentence.slice(0, starIdx);
  const lastComma = body.lastIndexOf(',');
  if (lastComma === -1) return null;
  const trimmed = body.slice(0, lastComma);
  return trimmed + '*' + calcNmeaChecksum(trimmed);
}

/** Accumule les chunks Bluetooth Classic (fragments de phrases NMEA) et traite les lignes complètes */
function onNmeaChunk(chunk) {
  nmeaBuffer += chunk;
  const lines = nmeaBuffer.split(/\r?\n/);
  nmeaBuffer = lines.pop();   // dernière ligne potentiellement incomplète

  for (const line of lines) {
    // Tenter la batterie sur toutes les lignes (réponses AT incluses)
    tryParseBatteryFromLine(line);
    if (!line.startsWith('$')) continue;
    // Normaliser le talker ID vers GP pour compatibilité nmea-simple
    // GN = multi-constellation, GL = GLONASS, GA = Galileo, GB = BeiDou
    // Note: utiliser une fonction de remplacement pour éviter l'interprétation de '$' comme référence de capture
    const normalized = line.replace(/^\$G[NLABP]/, () => '$GP');
    try {
      const sentence = parseNmeaSentence(normalized);
      nmeaParsed = processSentence(sentence);
    } catch (err) {
      // Tenter de stripper le dernier champ NMEA 4.1 et recalculer le checksum
      const stripped = stripLastNmeaField(normalized);
      if (stripped) {
        try {
          const sentence = parseNmeaSentence(stripped);
          nmeaParsed = processSentence(sentence);
          console.log(nmeaParsed);
          continue;
        } catch (_) {}
      }
      // Ne pas loguer les sentences propriétaires connues (déjà traitées par tryParseBatteryFromLine)
      if (!line.startsWith('$PGSTX,')) {
        console.log('[ble-gps] unknown sentence', line, err.message);
      }
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
    gpsState.geoidal    = s.geoidalSeparation ?? s.geoidalSeperation ?? null;
    gpsState.fixType    = QUALITY_MAP[s.fixType] ?? null;
    gpsState.satellites = s.satellitesInView;
    gpsState.time       = s.datetime ?? s.time;
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

  return gpsState;
}

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
    quality:     gpsState.fixType    ?? null,   // 'fix', 'dgps-fix', 'rtk'…
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

/**
 * Enregistre un callback appelé avec le niveau de batterie (0-100) à chaque lecture.
 * Détection basée sur les trames NMEA propriétaires reçues du GPS.
 * @param {function(number):void} cb
 */
export function setBatteryCallback(cb) {
  batteryCallback = cb;
}

/** Restitue le mode GPS interne (navigator.geolocation natif). */
function restoreInternalMode(onSuccess, onError) {
  if (batteryTimer) { clearInterval(batteryTimer); batteryTimer = null; }
  if (currentDevice) {
    BluetoothSerial.stopNotifications({ address: currentDevice.deviceId }).catch(() => {});
    if (nmeaListener) { nmeaListener.remove(); nmeaListener = null; }
    BluetoothSerial.disconnect({ address: currentDevice.deviceId }).catch(() => {});
    currentDevice = null;
  }
  watchCallbacks = {};
  gpsState       = {};
  nmeaBuffer     = '';

  // Restaurer les méthodes natives sauvegardées au démarrage
  if (nativeWatchPosition)      navigator.geolocation.watchPosition      = nativeWatchPosition;
  if (nativeClearWatch)         navigator.geolocation.clearWatch         = nativeClearWatch;
  if (nativeGetCurrentPosition) navigator.geolocation.getCurrentPosition = nativeGetCurrentPosition;

  onSuccess && onSuccess({ type: 'internal' });
}

/** Connecte le GPS Bluetooth Classic (SPP) et injecte les positions dans navigator.geolocation */
async function setExternalMode(onSuccess, onError) {
  try {
    // Afficher l'indicateur de chargement pendant le scan
    if (loadingFn) loadingFn(true);

    // Récupérer les appareils appariés via scan Bluetooth Classic
    const scanResult = await BluetoothSerial.scan().catch(() => ({ devices: [] }));

    if (loadingFn) loadingFn(false);

    const bonded = (scanResult.devices || []).map(d => ({ deviceId: d.address || d.id, name: d.name }));
    const gpsDevices = bonded.filter(d => d.name && GPS_PREFIXES.some(p => d.name.startsWith(p)));
    const candidates = gpsDevices.length > 0 ? gpsDevices : bonded;

    let device;
    if (candidates.length === 0) {
      throw new Error('Aucun appareil Bluetooth appairé trouvé. Vérifiez les paramètres Bluetooth.');
    } else if (candidates.length === 1) {
      device = candidates[0];
    } else if (selectDialogFn) {
      const choice = {};
      for (const d of candidates) {
        choice[d.deviceId] = d.name || d.deviceId;
      }
      device = await new Promise((resolve, reject) => {
        selectDialogFn(choice, 'Sélectionner le GPS Bluetooth', (selected) => {
          const d = candidates.find(d => d.deviceId === selected);
          if (d) resolve(d); else reject(new Error('Appareil non trouvé'));
        });
      });
    } else {
      // Pas de dialog injecté : prendre le premier GPS reconnu
      device = candidates[0];
    }

    currentDevice = device;

    // Déconnexion préventive pour purger un état résiduel
    await BluetoothSerial.disconnect({ address: device.deviceId }).catch(() => {});
    await BluetoothSerial.connect({ address: device.deviceId });

    // Abonnement aux trames NMEA ligne par ligne
    nmeaListener = await BluetoothSerial.addListener('onRead', (data) => {
      onNmeaChunk(data.value);
    });
    await BluetoothSerial.startNotifications({ address: device.deviceId, delimiter: '\n' });

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
    if (loadingFn) loadingFn(false);
    const msg = e?.message || e?.errorMessage || String(e);
    const code = e?.code !== undefined ? ` (code ${e.code})` : '';
    console.error('[ble-gps] Connexion BLE GPS échouée :', e);
    currentDevice = null;
    onError && onError(`Connexion échouée : ${msg}${code}`);
  }
}

// Override de navigator.geolocation.setSource
document.addEventListener('deviceready', () => {
  // Sauvegarder les méthodes natives de navigator.geolocation avant tout monkey-patch
  nativeWatchPosition      = navigator.geolocation.watchPosition.bind(navigator.geolocation);
  nativeClearWatch         = navigator.geolocation.clearWatch.bind(navigator.geolocation);
  nativeGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);

  // Demander les permissions GPS dès le démarrage via @capacitor/geolocation
  Geolocation.requestPermissions().catch((e) => {
    console.warn('[ble-gps] requestPermissions:', e);
  });

  navigator.geolocation.hasSource    = true;
  navigator.geolocation.canSetSource = true;

  navigator.geolocation.setSource = function(source, onSuccess, onError) {
    if (source === 'external') {
      setExternalMode(onSuccess, onError);
    } else {
      restoreInternalMode(onSuccess, onError);
    }
  };
}, false);
