import './style.css'
import wapp from './guichet/guichet'
import './codes'
import './maintenance'
import CordovApp from 'cordovapp/CordovApp';

// global var
window.wapp = wapp;
window.CordovApp = CordovApp;
window.CordovFile = CordovApp.File;