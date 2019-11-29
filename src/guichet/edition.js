import wapp from '../wapp'
import ol_ext_element from 'ol-ext/util/element'

/** Ajouter une nouvelle ligne a éditer
 * @param {Element} ul liste element
 * @param {ol.Feature} feature current feature
 * @param {*} ftype featureType attribute
 * @param {string} att current attribut name
 */
function _addLine (ul, feature, ftype) {
  const att = ftype.name;
  if (ftype.readOnly) return;
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
          if (ftype.max_length && input.value.length > ftype.max_length) {
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
        checked: feature.get(att),
        type: 'checkbox',
        parent: label
      });
      ol_ext_element.create('SPAN', {
        parent: label
      });
      break;
    }
    // Choice
    case 'Choice': {
      const elt = ol_ext_element.create('INPUT', {
        value: feature.get(att),
        disabled: "disabled",
        parent: li
      });
      li.addEventListener('click', () => {
        const values = {};
        if (ftype.listOfValues) {
          ftype.listOfValues.forEach((v) => {
            if (v===null) values[''] = '<i>indéfini</i>';
            else values[v] = v;
          })
          wapp.selectDialog(values, elt.value, (val) => {
            elt.value = val;
          });
        }
      });
      break;
    }
    // Date
    case 'Date': {
      ol_ext_element.create('INPUT', {
        value: feature.get(att),
        type: 'date',
        parent: li
      });
      break;
    }
    // DateTime
    case 'DateTime': {
      let val = feature.get(att) || '';
      if (!/T/.test(val)) val = val.replace(' ','T');
      ol_ext_element.create('INPUT', {
        value: val,
        type: 'datetime-local',
        parent: li
      });
      break;
    }
    // Number
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
    // Geometry
    case 'Point':
    case 'LineString':
    case 'Polygon':
    case 'MultiPolygon': {
      return null;
    }
    // ???
    default: {
      ol_ext_element.create('INPUT', {
        value: feature.get(att),
        readOnly: 'readOnly',
        parent: li
      });
      return null;
    }
  }

  return li;
};

/** Edit current feature
 * 
 */ 
wapp.editFeature = function() {
  const feature = this.select.getFeatures().item(0);
  if (!feature) return;
  const editProperties = {};

  //$('#fiche .selection').removeClass("multi");
  const div = document.querySelector('#fiche .selection');
  div.classList.remove('multi');
  const ftype = feature.layer.getFeatureType();
  
  const ul = div.querySelector('.fiche').querySelector('ul');// 
  //$(".fiche ul", div).html('');
  ul.innerText = '';
  
  // Formulaire
  var i;
  for (i in ftype.attributes) {
    if (i !== ftype.geometryName && i !== ftype.idName) {
      editProperties[i] = _addLine(ul, feature, ftype.attributes[i]);
    }
  }
  console.log('EDITION')
  // Buttons
  const li = ol_ext_element.create('LI', {
    parent: ul
  });
  ol_ext_element.create ('DIV', {
    html: 'annuler',
    'data-role': 'dialogBt',
    click: () => {
      wapp.showSelect();
    },
    parent: li
  });
  ol_ext_element.create ('DIV', {
    html: 'enregistrer',
    'data-role': 'dialogBt',
    click: () => {
      console.log(editProperties)
      for (let k in editProperties) {
        if (editProperties[k]) {
          const input = editProperties[k].querySelector('input');
          switch (ftype.attributes[k].type) {
            case 'Boolean': {
              feature.set(k, input.checked);
              break;
            }
            case 'Integer': {
              feature.set(k, parseInt(input.value));
              break;
            }
            case 'Double': {
              feature.set(k, parseFloat(input.value));
              break;
            }
            case 'DateTime': {
              console.log(feature.get(k))
              if (!/T/.test(feature.get(k))) feature.set(k, input.value.replace('T',' '));
              else feature.set(k, input.value);
              break;
            }
            default: {
              feature.set(k, input.value);
              break;
            }
          }
        }
      }
      wapp.showSelect();
    },
    parent: li
  });
};
