/*eslint no-useless-escape: "off"*/

import wapp from '../wapp'
import ol_ext_element from 'ol-ext/util/element'
import {createFormForTable} from 'collab-form';
import { alertDlg } from 'cordovapp/cordovapp/dialog'

/** 
 * Edit current feature
 * @param {boolean} [closeOnSubmit=false]
 */ 
wapp.editFeature = function(closeOnSubmit) {
  const feature = this.select.getFeatures().item(0);
  if (!feature) return;

  let editProperties = feature.getProperties();

  // Mode edition
  const div = document.querySelector('#fiche .selection');
  div.classList.remove('multi');
  const table = feature.layer.getTable();
  div.querySelector('.edit').style.display = 'none';

  const ul = div.querySelector('.fiche').querySelector('ul');
  ul.innerText = '';
  $(ul).removeClass("read-only");
    
  // Ajout du userId pour le fonctionnement du champs like
  for (var i in table.columns) {
    if (table.columns[i].type.toLowerCase() === "like") {
      table.columns[i].userId = wapp.userManager.userId;
    }
  }
  // Formulaire
  let form = createFormForTable($(ul), "form-atts", table, editProperties, "mobile");
  $(".feature-form").ready(function(){
    form.init();
  });
  
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
      if (closeOnSubmit) {
        wapp.hidePage(); 
        wapp.select.getFeatures().clear(); 
        wapp.onSelect();
      } else {
        wapp.showSelect();
      }
    },
    parent: li
  });

  // SAVE
  ol_ext_element.create ('DIV', {
    html: 'enregistrer',
    'data-role': 'dialogBt',
    click: () => {
      // validation
      var attr = {};
      for (var i in form.attributes) {
        let attribute = form.attributes[i]
        if (!attribute.validate()) {
          alertDlg('Erreur sur "' + attribute.title + '": ' +  attribute.error);
          return;

          // wapp.alert('<i class="fa fa-fleft fa-exclamation-triangle fa-2x"></i>'
          // +'<h3>Le formulaire contient des erreurs...</h3>'
          // +'Merci de les corriger avant de pouvoir enregistrer.', {
          //   title: ''
          // });
          // return;
        }
        attr[attribute.name] = attribute.getNormalizedValue();
      }

      // Get modifications
      for (let name in attr) {
        if (attr[name] !=  feature.get(name)) {
          feature.set(name, attr[name]);
        }
      }
      // Back to selection
      if (closeOnSubmit) {
        wapp.hidePage(); 
        wapp.select.getFeatures().clear(); 
        wapp.onSelect();
      } else {
        wapp.showSelect();
      }
    },
    parent: li
  });
};
