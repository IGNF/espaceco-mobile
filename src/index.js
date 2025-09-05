require('dotenv').config();
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
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'

// Function to initialize/reset iOS StatusBar configuration
function initializeIOSStatusBar() {
  if (typeof window !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios') {
    try {
      StatusBar.setOverlaysWebView({ overlay: false })
      // Additional StatusBar settings to ensure proper behavior
      StatusBar.setStyle({ style: 'dark' }) // test without this
      StatusBar.show()
    } catch (e) { /* noop */ }
    try {
      document.documentElement.classList.add('platform-ios')  // test without this
      // Force a reflow to ensure proper layout
      // document.body.offsetHeight
    } catch (e) { /* noop */ }
  }
}

// Initialize on startup
initializeIOSStatusBar()

// Make the function globally available so it can be called after camera operations
window.initializeIOSStatusBar = initializeIOSStatusBar

// Add event listeners to detect when the app regains focus (e.g., after camera closes)
// This provides an additional safety net for StatusBar reset
if (typeof window !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios') {
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      // App regained focus, reset StatusBar after a short delay
      setTimeout(initializeIOSStatusBar, 100);
    }
  });

  window.addEventListener('focus', function () {
    // Window regained focus, reset StatusBar after a short delay
    setTimeout(initializeIOSStatusBar, 100);
  });
}


// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;
