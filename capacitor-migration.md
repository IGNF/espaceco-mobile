
*Ce document a pour but de lister les éléments qui seraient à modifier pour une migration de Cordova vers Capacitor*

## État des lieux

**Il semblerait que la plupart des références à Cordova viennent du module interne CordovApp, particulièrement :**

- cordovapp/photo.js : appareil photo
- cordovapp/File.js : file system
- cordovapp/CordovApp.js : dialogs (navigator.notification)

**Les modules Cordova intégrés directement dans l'app qui seraient à modifier :**

- ✅ cordova-plugin-network-information (wapp.js & fiche.js) => https://capacitorjs.com/docs/apis/network
- ✅ cordova-plugin-geolocation (wapp.js & apiTemplate.js) => https://capacitorjs.com/docs/apis/geolocation
- ⚠️ cordova-plugin-bluetooth-serial - **Android uniquement ?** - (apiTemplate, wapp.js - wapp.selectGPS()): https://github.com/giuseppelanzi/BluetoothSerial - pourrait rester tel quel, à tester dans le POC -

**D'autres modules semblent ne pas être utilisés ? À confirmer :**

- cordova-plugin-listpicker (aucune référence à listpicker.xxx)

## Possibilités

Il existe deux possibilités pour la migration :
- Utiliser Capacitor majoritairement pour l'aspect pratique du développement et du build, en remplaçant simplement les modules network et geolocation
- Intégrer Capacitor plus en profondeur, en réécrivant l'intégration native de cordovapp