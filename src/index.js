require('dotenv').config();
import 'collab-form/scss/main.scss'
import './style.css'
import './i18n'
import wapp from './guichet/guichet'
import './report/georemGPS'
import './codes'
import './maintenance'
import './apiTemplate'
import CordovApp from 'cordovapp/CordovApp';

import './collab-form.css'
import 'cordovapp/cordovapp/slider.css'

// Import specific options
import './appli/appli.js'


// global var
window.wapp = wapp;
// DEBUG
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;