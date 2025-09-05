import { Capacitor } from '@capacitor/core'

// returns "ios" or "android" or "web"
export function getDeviceOs() {
  return Capacitor.getPlatform() || 'web';
}