/* Special scripts for Naviforest app */
import wapp from '../wapp'
import config from '../config'
import ol_ext_element from 'ol-ext/util/element'

import apropos from './page/apropos'
import noguichet from './page/noguichet'
import './appli.css'

/* Disable change guichet (force config.guichetID)
 * @overwrite wapp.setGuichet
 */
const setGuichet = wapp.setGuichet
wapp.setGuichet = function(groupe) {
  // Remove current
  wapp.userManager.param.active_community = undefined
  // New guichet / groupe
  groupe = wapp.userManager.getGroupById(config.guichetID)
  wapp.report.setProfil(config.guichetID)
  wapp.userManager.refreshGroupInfos(groupe)
  setGuichet.call(this, groupe);
}

/* App is ready
 */
wapp.ready(() => {
  // Prevent group change
  document.querySelector('[data-role="menu"] .header').onclick = () => {
    if (!wapp.getIdGuichet()) {
      wapp.alert(
        'Votre compte ne permet pas d\'accéder aux guichet Naviforest !', 
        'NaviForest'
      )
    }
  };
  ol_ext_element.create('DIV', {
    html: noguichet, 
    parent: document.querySelector('#layer-guichet .noguichet')
  })
  // Update about
  document.querySelector('#apropos .ecoInfo').innerHTML = apropos;
  document.querySelector('#apropos h2').innerHTML = `
    NaviForest v.<span class="version">` + config.version + `</span>
    <span style="font-size:0.5em; display: block;">
      La solution IGN pour gérer une base de données de façon collaborative.
    </span>
  `
  console.log('READY', process.env.APPLI)
})

/* Guichet has changed
 */
wapp.on('change:guichet', e => {
  // console.log('guichet', e.group)
})