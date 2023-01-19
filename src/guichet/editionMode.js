import CordovApp from "cordovapp/CordovApp";
import ol_ext_element from "ol-ext/util/element";

import './editionMode.css'

// New edition bar (after selection)
const editionBar = ol_ext_element.create('DIV', {
  id: 'editionBar'
})
document.querySelector('#selection').insertAdjacentElement('afterend', editionBar)

/** Qui edition mode
 */
function quitEditionMode() {
  wapp.select.setActive(true);
  delete document.body.dataset.layerEdition;
}

// Quit button
const layerNameDiv = ol_ext_element.create('SPAN', { parent: editionBar })
ol_ext_element.create('BUTTON', { 
  html: 'Quitter l\'édition',
  className: 'button',
  click: quitEditionMode,
  parent: editionBar 
})

/** Set edition mode
 * @param {CordovApp} [wapp]
 * @param {CollabVector} [layer] the layer to edit (if none quit edition mode)
 */
const editionMode = function(wapp, layer) {
  if (!layer) {
    quitEditionMode()
    return;
  }
  wapp.hidePage();
  // disable select
  wapp.select.setActive(false);
  document.body.dataset.layerEdition = '';
  layerNameDiv.innerText = layer.get('title')
}


export default editionMode