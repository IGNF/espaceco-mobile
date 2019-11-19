import wapp from '../wapp'

import ol_ext_element from 'ol-ext/util/element'

/** Ajouter une nouvelle ligne a éditer
 * @param {Element} ul liste element
 * @param {ol.Feature} feature current feature
 * @param {*} ftype featureType attribute
 * @param {string} att current attribut name
 */
function _addLine (ul, feature, ftype, att) {
  if (ftype.readOnly) return;
  console.log(ftype);
  const li = ol_ext_element.create('LI', {
    className: 'edition '+ftype.type,
    parent: ul
  });
  // Label
  const label = ol_ext_element.create('LABEL', {
    html: ftype.title,
    parent: li
  });
  let error = '';
  ol_ext_element.create('DIV', {
    className: 'error',
    click: () => {
      if (error) {
        wapp.alert(error);
      }
    },
    parent: li
  });
  // Input
  let input;
  switch (ftype.type) {
    // Chaine de caractères
    case 'String': {
      input = ol_ext_element.create('INPUT', {
        value: feature.get(att),
        parent: li
      });
      ['keyup','change','input'].forEach((e) => {
        input.addEventListener(e, () => {
          if (input.value.length > ftype.max_length) {
            li.classList.add('error');
            error = 'Chaine trop longue ('+ftype.max_length+' caractères maxi.)...';
          } else {
            li.classList.remove('error');
            error = '';
          }
        });
      });
      break;
    }
    // Boolean
    case 'Boolean': {
      ol_ext_element.create('INPUT', {
        value: feature.get(att),
        type: 'checkbox',
        on: {
          change: () => { console.log('ok') }
        },
        parent: label
      });
      ol_ext_element.create('SPAN', {
        parent: label
      });
      break;
    }
    case 'Choice': {
      const elt = ol_ext_element.create('INPUT', {
        value: feature.get(att),
        disabled: "disabled",
        parent: li
      });
      li.addEventListener('click', () => {
        const values = {};
        ftype.listOfValues.forEach((v)=>{
          if (v===null) values[''] = '<i>indéfini</i>';
          else values[v] = v;
        })
        wapp.selectDialog(values, elt.value, (val) => {
          elt.value = val;
        })
      });
      break;
    }
    case 'Date':
    case 'DateTime': {
      ol_ext_element.create('INPUT', {
        value: feature.get(att),
        type: (ftype.type==='Date' ? 'date' : 'datetime-local'),
        parent: li
      });
      break;
    }
    case 'Integer':
    case 'Double': {
      input = ol_ext_element.create('INPUT', {
        value: feature.get(att),
        type: 'number',
        parent: li
      });
      ['keyup','change','input'].forEach((e) => {
        input.addEventListener(e, () => {
          if (input.value!==0 && !input.value) {
            li.classList.add('error');
            error = '"'+att+'" doit être un nombre valide...';
          } else if (ftype.type === 'Integer' && parseInt(input.value) !== parseFloat(input.value)) {
            li.classList.add('error');
            error = '"'+att+'" doit être un entier...';
          } else {
            li.classList.remove('error');
            error = '';
          }
        });
      });
      break;
    }
    default: {
      ol_ext_element.create('INPUT', {
        value: feature.get(att),
        readOnly: 'readOnly',
        parent: li
      });
      break;
    }
  }
};

/** Edit current feature
 * 
 */ 
wapp.editFeature = function() {
  const feature = this.select.getFeatures().item(0);
  if (!feature) return;

  //$('#fiche .selection').removeClass("multi");
  const div = document.querySelector('#fiche .selection');
  div.classList.remove('multi');
  const prop = feature.getProperties();
  const ftype = feature.layer.getFeatureType();
  
  const ul = div.querySelector('.fiche').querySelector('ul');// 
  //$(".fiche ul", div).html('');
  ul.innerText = '';
  console.log(ul)
  const th = $('.fiche .themes', div).html('');
  
  // Formulaire
  var i, att;
  for (i in ftype.attributes) if (i !== ftype.geometryName) {
    att = ftype.attributes[i];
    switch (att.type) {
      case 'Point':
      case 'LineString':
      case 'Polygon':
      case 'MultiPolygon':
        break;
      default: {
        _addLine(ul, feature, att, i);
        break;
      }
    }
  }
};
