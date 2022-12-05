require('dotenv').config();
import './style.css'
import './i18n'
import wapp from './guichet/guichet'
import './ripart/georemGPS'
import './codes'
import './maintenance'
import './apiTemplate'
import CordovApp from 'cordovapp/CordovApp';

// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;