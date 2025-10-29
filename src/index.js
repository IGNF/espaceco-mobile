// require('dotenv').config();
import 'collab-form/scss/main.scss'
import './style.css'
import './i18n'
import wapp from './guichet/guichet'
import './report/georemGPS'
import './maintenance'
import './apiTemplate'
import CordovApp from 'cordovapp/CordovApp';

import './collab-form.css'
import 'cordovapp/cordovapp/slider.css'

// Import specific options
import './appli/appli.js'

// Capacitor: ensure iOS StatusBar does not overlay the WebView, and safe area is well handled on the bottom of the screen
import { getDeviceOs } from './capacitor-hooks/device-helper';
import { StatusBar } from '@capacitor/status-bar';

/**
 * Configure le comportement de la status bar iOS
 * qui, sur Capacitor, ne couvre pas le WebView
 * On ajoute la classe platform-ios pour les styles CSS
 * et on réinitialise la status bar lorsque l'app revient en focus (ex. retour de caméra)
 */
function initializeIOSStatusBar() {
  if (getDeviceOs() === 'ios') {
    try {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: 'dark' });
      StatusBar.show();
    } catch (e) {
      console.error('Error setting StatusBar', e);
    }
    try {
      document.documentElement.classList.add('platform-ios');
    } catch (e) {
      console.error('Error adding platform-ios class', e);
    }
  }
}

initializeIOSStatusBar();
window.initializeIOSStatusBar = initializeIOSStatusBar;

if (getDeviceOs() === 'ios') {
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      setTimeout(initializeIOSStatusBar, 100);
    }
  });

  window.addEventListener('focus', function () {
    setTimeout(initializeIOSStatusBar, 100);
  });
}


// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;
