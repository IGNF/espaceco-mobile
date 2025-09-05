import { KeepAwake } from '@capacitor-community/keep-awake';

export function keepDeviceAwake() {
  KeepAwake.isSupported().then(isSupported => {
    if (isSupported) {
      KeepAwake.keepAwake().then(() => {
        console.log('Keep awake');
      });
    }
    else {
      console.log('Keep awake not supported');
    }
  });
}

export function allowDeviceSleep() {
  KeepAwake.isSupported().then(isSupported => {
    if (isSupported) {
      KeepAwake.allowSleep().then(() => {
        console.log('Allow sleep');
      });
    }
    else {
      console.log('Allow sleep not supported');
    }
  });
}