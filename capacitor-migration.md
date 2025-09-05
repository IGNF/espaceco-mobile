
*Ce document a pour but de lister les éléments qui seraient à modifier pour une migration de Cordova vers Capacitor*

## État des lieux

**Les modules Cordova qui seraient à modifier :**

- ❌ cordova-plugin-geolocation (wapp.js & apiTemplate.js) => https://capacitorjs.com/docs/apis/geolocation
- ❌ cordova-plugin-bluetooth-serial - **Android uniquement ?** - (apiTemplate, wapp.js - wapp.selectGPS()): https://github.com/giuseppelanzi/BluetoothSerial
- ⏳ cordova-plugin-background-mode → ⚠️ Utilisé par CordovApp (CacheMap.js)
- ⏳ cordova-plugin-email-composer => https://github.com/EinfachHans/capacitor-email-composer
- ⏳ cordova-plugin-device => https://capacitorjs.com/docs/apis/device → Non utilisé ?
- ⏳ cordova-plugin-listpicker → Non utilisé ?
- ✅ cordova-plugin-inappbrowser (remplacé par AppLauncher)
- ✅ cordova-plugin-network-information
- ✅ cordova-plugin-insomnia
- ✅ cordova-plugin-camera

## Légende
❌ = Plugins à ne pas migrer en l'état (trop de dépendances, ou pas d'équivalence Capacitor existant)
⏳ = À migrer OU supprimer si non utilisé
✅ = Déjà migré