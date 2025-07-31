/*eslint no-useless-escape: "off"*/

import wapp from '../wapp'
import ol_ext_element from 'ol-ext/util/element'
const collabForm = require('collab-form');
import { alertDlg } from 'cordovapp/cordovapp/dialog'
import { DocumentForm } from 'cordovapp/collaboratif/DocumentForm'

/**
 * Initialisation des champs document du formulaire
 */
const initDocumentForm = function () {
  let docForm = new DocumentForm(wapp);
  docForm.init();
}

/** 
 * Edit current feature
 * @param {boolean} [closeOnSubmit=false]
 */ 
wapp.editFeature = function(closeOnSubmit, source) {
  const feature = this.select.getFeatures().item(0);
  if (!feature) return;

  let editProperties = feature.getProperties();
  //en cas de creation on ne veut pas passer de valeurs
  // ne serait ce que null qui est une valeur en soi (permet de vider un champs)
  let isNew = (('isNew' in feature) && feature.isNew) ? true : false;
  if (isNew) editProperties = null;

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
  let form = collabForm.createFormForTable($(ul), "form-atts", table, editProperties, "mobile");
  $(".feature-form").ready(function(){
    form.init();
    initDocumentForm();
  });
  $(window).on('new_json_object_event', (event, jsonFormId) => {
    $(".feature-form .far").each((i, e) => {
      $(e).addClass('fa').removeClass('far');
    });
    $(`#${jsonFormId} .fa-trash-alt`).each((i, e) => {
      $(e).addClass('fa-trash').removeClass('fa-trash-alt');
    });
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
        let f = wapp.select.getFeatures().item(0);
        if (('isNew' in f) && f.isNew && source) source.removeFeature(f);
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
      let htmlErrors = "";
      let errors = {};
      for (var i in form.attributes) {
        let attribute = form.attributes[i]
        if (!attribute.validate()) {
          errors[attribute.id] = attribute.error;
          htmlErrors += '<p>Erreur sur "' + attribute.title + '": ' +  attribute.error + '</p>';
        }
        attr[attribute.name] = attribute.getNormalizedValue();
      }

      if (Object.keys(errors).length) {
        for (let id in errors) {
          var $elt = $('.feature-form .table .feature-attribute#' + id);
          $elt.addClass('has-error');
          $('.feature-form table label[for="' + id + '"]').addClass('has-error');
          
        }
        alertDlg(htmlErrors);
        return;
      }

      // Get modifications
      for (let name in attr) {
        if (attr[name] && attr[name].cnt && feature.get(name) && feature.get(name).cnt) {
          if (parseInt(attr[name].cnt) > parseInt(feature.get(name).cnt)) feature.set(name, attr[name]);
        } else if (attr[name] != feature.get(name)) {
          feature.set(name, attr[name]);
        }
      }
      feature.isNew = false;
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
