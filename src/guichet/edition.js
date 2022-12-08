/*eslint no-useless-escape: "off"*/

import wapp from '../wapp'
import ol_ext_element from 'ol-ext/util/element'
import EditionInput from './EditionInput';

/** Ajouter une nouvelle ligne a éditer
 * @param {Element} ul liste element
 * @param {ol.Feature} feature current feature
 * @param {*} table table attribute
 * @param {string} att current attribut name
 */
function _addLine (ul, feature, table) {
  if (table.read_only) return; 

  // New line
  const li = ol_ext_element.create('LI', {
    className: 'edition '+table.type,
    parent: ul
  });

  // New imput
  const att = table.name;
  return new EditionInput(table, feature.get(att), li, feature._updates ? feature._updates[att] : undefined)
}

/** Edit current feature
 */ 
wapp.editFeature = function() {
  const feature = this.select.getFeatures().item(0);
  if (!feature) return;

  const editProperties = {};

  // Mode edition
  const div = document.querySelector('#fiche .selection');
  div.classList.remove('multi');
  const table = feature.layer.getTable();
  div.querySelector('.edit').style.display = 'none';
  
  const ul = div.querySelector('.fiche').querySelector('ul');
  ul.innerText = '';
  $(ul).parent().addClass('edition');
  
  // Formulaire
  var i;
  for (i in table.columns) {
    if (i !== table.geometry_name && i !== table.id_name) {
      editProperties[i] = _addLine(ul, feature, table.columns[i]);
    }
  }
  // Show selected themes attr
  var bt = $('.themes .selected', div);
  if (bt.length) bt.click();

  // Buttons
  const li = ol_ext_element.create('LI', {
    className: 'buttons',
    parent: ul
  });

  // CANCEL
  ol_ext_element.create ('DIV', {
    html: 'annuler',
    'data-role': 'dialogBt',
    click: () => {
      wapp.showSelect();
    },
    parent: li
  });

  // SAVE
  ol_ext_element.create ('DIV', {
    html: 'enregistrer',
    'data-role': 'dialogBt',
    click: () => {
      // Check remaining error
      if (ul.querySelector('li.error:not([hidden])')) {
        wapp.alert('<i class="fa fa-fleft fa-exclamation-triangle fa-2x"></i>'
          +'<h3>Le formulaire contient des erreurs...</h3>'
          +'Merci de les corriger avant de pouvoir enregistrer.', {
            title: ''
          });
        return;
      }
      // Get modifications
      for (let k in editProperties) {
        if (editProperties[k] && editProperties[k].hasChanged()) {
          feature.set(k, editProperties[k].val());
        }
      }
      // Back to selection
      wapp.showSelect();
    },
    parent: li
  });
};
