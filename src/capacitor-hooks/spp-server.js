/**
 * Wrapper JS du plugin natif « SppServer » (serveur RFCOMM Bluetooth Classic).
 *
 * Permet au téléphone d'écouter en serveur SPP pour recevoir le flux NMEA d'un
 * récepteur GPS qui n'émet qu'en se connectant vers un port COM Bluetooth sortant
 * (ex. Trimble GeoExplorer / XT — sortie NMEA « Bluetooth (COM9) »).
 *
 * Évènements :
 *   - 'onRead'   → { value: string }              (fragments de données reçues)
 *   - 'onStatus' → { state: string, device?: string }  ('listening' | 'connected' | 'disconnected')
 */

import { registerPlugin } from '@capacitor/core';

/**
 * @typedef {Object} SppServerPlugin
 * @property {() => Promise<void>} start            Démarre l'écoute serveur SPP.
 * @property {() => Promise<void>} stop             Arrête le serveur et ferme les sockets.
 * @property {() => Promise<{running: boolean}>} isRunning
 * @property {(opts?: {duration?: number}) => Promise<void>} makeDiscoverable  Rend le téléphone visible en Bluetooth.
 * @property {() => Promise<{devices: Array<{name: string, address: string, bondState: number}>}>} listBonded  Liste les appareils appairés (diagnostic).
 * @property {(eventName: string, cb: (data: any) => void) => Promise<import('@capacitor/core').PluginListenerHandle>} addListener
 */

/** @type {SppServerPlugin} */
export const SppServer = registerPlugin('SppServer');
