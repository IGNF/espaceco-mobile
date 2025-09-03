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
if (typeof window !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios') {
  try { StatusBar.setOverlaysWebView({ overlay: false }) } catch (e) { /* noop */ }
  try { document.documentElement.classList.add('platform-ios') } catch (e) { /* noop */ }
}


// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;
