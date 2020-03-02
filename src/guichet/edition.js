import wapp from '../wapp'
import ol_ext_element from 'ol-ext/util/element'


/** Gestion des erreurs et contraintes de saisie
 * @param {FeatureType} ftype
 * @param {*} value
 */
function _getError(ftype, value) {
  const att = ftype.name;
  switch (ftype.type) {
    case 'String': {
      if (ftype.max_length && value.length > ftype.max_length) {
        return ('Chaine trop longue ('+ftype.max_length+' caractères maxi.)...');
      } else if (ftype.min_length && value.length < ftype.min_length) {
        return ('Chaine trop courte ('+ftype.min_length+' caractères mini.)...');
      }
      break;
    }
    case 'Year':
    case 'Integer':
    case 'Double': {
      if ((value!==0 && !value) || isNaN(Number(value))) {
        if (ftype.type==='Year') {
          return ('"'+att+'" doit être une année...');
        }
        return ('"'+att+'" doit être un nombre valide...');
      } else if (ftype.type === 'Integer' && parseInt(value) !== parseFloat(value)) {
        return ('"'+att+'" doit être un entier...');
      } else if (ftype.min_value && parseFloat(value) < ftype.min_value) {
        if (ftype.min_value === 0) return ('"'+att+'" doit être positif...');
        else return ('Valeur trop petite ( > '+ftype.min_value+')...');
      } else if (ftype.max_value  && parseFloat(value) > ftype.max_value ) {
        return ('Valeur trop grande ( < '+ftype.max_value +')...');
      }
      break;
    }
  }
  // Non nulle
  if (ftype.nullable === false && value==='') {
    return ('Vous devez entrer une valeur...');
  }
  // required 
  if (ftype.required && value==='') {
    return ('Champ obligatoire...');
  }
  // pattern  
  if (ftype.pattern && !(new RegExp(ftype.pattern)).test(value) && value !== '') {
    switch (ftype.pattern) {
      case '^([a-z0-9_\\.-]+)@([\\da-z\\.-]+)\\.([a-z\\.]{2,6})$':
        return ('La valeur doit être une adresse mail valide...');
      case '^(https?:\\/\\/)?([\\da-z\\.-]+).([a-z\\.]{2,6})([\\/\w\\.-]*)*\\/?$':
        return ('La valeur doit être une adresse internet valide...');
      case '^(\\+33[ -]?|0)[1-9][ -]?(\\d{2}[ -]?){4}$':
        return ('La valeur doit être un munéro de téléphone valide...');
      case '^((0[1-9]|[1-8]\\d|9[0-5])\\d{3})|((97[1-5]|98[46789])\\d{2})$':
        return ('La valeur doit être un code postal valide...');
      case '^((0[1-9]|[1-8]\\d|9[0-5]|2[AB])\\d{3})|((97[1-5]|98[46789])\\d{2})$':
        return ('La valeur doit être un code INSEE valide...');
      default:
        return ('La valeur doit être de la forme : '+ftype.pattern);
    }
  }
  return '';
}

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

  // Gestion des erreurs
  const error = {
    error: '',
    li: li,
    set: function(oops) {
      if (oops) this.li.classList.add('error');
      else this.li.classList.remove('error');
      this.error = oops;
    },
    show: function() {
      if (this.error) {
        wapp.alert(this.error);
      }
    }
  };
  function addChangeListener(input, listener) {
    ['keyup','change','input'].forEach((e) => {
      input.addEventListener(e, listener);
    });
  }

  ol_ext_element.create('DIV', {
    className: 'error',
    click: () => error.show(),
    parent: li
  });

  // Input
  let input;
  let val;
  let ktype = ftype.listOfValues ? 'Choice' : ftype.type;
  switch (ktype) {
    // Chaine de caractères
    case 'String': {
      input = ol_ext_element.create('INPUT', {
        value: feature.get(att),
        parent: li
      });
      addChangeListener(input, () => {
        error.set(_getError(ftype, input.value));
      });
      break;
    }
    // Boolean
    case 'Boolean': {
      input = ol_ext_element.create('INPUT', {
        checked: feature.get(att),
        type: 'checkbox',
        parent: label
      });
      ol_ext_element.create('SPAN', {
        parent: label
      });
      addChangeListener(input, () => {
        error.set(_getError(ftype, input.checked));
      });     
      break;
    }
    // Choice
    case 'Choice': {
      input = ol_ext_element.create('INPUT', {
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
          });
          wapp.selectDialog(values, input.value, (val) => {
            input.value = val;
          });
        }
      });
      addChangeListener(input, () => {
        error.set(_getError(ftype, input.value));
      });
      break;
    }
    // Date
    case 'YearMonth':
    case 'Date': {
      val = feature.get(att);
      if (ftype.type==='YearMonth') val = val.replace(/(\d+)-(\d+)-.*/,'$1-$2');
      input = ol_ext_element.create('INPUT', {
        value: val,
        type: ftype.type==='Date' ? 'date' : 'month',
        parent: li
      });
      addChangeListener(input, () => {
        error.set(_getError(ftype, input.value));
      });
      break;
    }
    // DateTime
    case 'DateTime': {
      val = feature.get(att) || '';
      if (!/T/.test(val)) val = val.replace(' ','T');
      input = ol_ext_element.create('INPUT', {
        value: val,
        type: 'datetime-local',
        parent: li
      });
      addChangeListener(input, () => {
        error.set(_getError(ftype, input.value));
      });
      break;
    }
    // Number
    case 'Year': 
    case 'Integer':
    case 'Double': {
      // Number si nombre positif ou tel pour avec acces aux signe '-' sur clavier smartphone
      let type = ((ftype.min_value && ftype.min_value >= 0) || ftype.min_value===0) ? 'number' : 'tel';
      if (ftype.type==='Year') type = 'number';
      input = ol_ext_element.create('INPUT', {
        value: feature.get(att),
        type: type, 
        parent: li
      });
      addChangeListener(input, () => {
        if (type==='tel') input.value = input.value.replace(/,/g,'.'); // format anglais avec '.' plutot que ','
        error.set(_getError(ftype, input.value));
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
    // Inconnu / non traite
    case 'JsonValue': 
    case 'Document': 
    case 'Like': 
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
}

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
      if (ul.querySelector('li.error:not([hidden])')) {
        wapp.alert('<i class="fa fa-fleft fa-exclamation-triangle fa-2x"></i>'
          +'<h3>Le formulaire contient des erreurs...</h3>'
          +'Merci de les corriger avant de pouvoir enregistrer.', {
            title: ''
          });
        return;
      }
      for (let k in editProperties) {
        if (editProperties[k]) {
          const input = editProperties[k].querySelector('input');
          let val = getAttributeValue(input, ftype.attributes[k].type, feature.get(k));
          feature.set(k, val);
        }
      }
      wapp.showSelect();
    },
    parent: li
  });
};

/** Get the value in the input according to its type
 * @param {Element} input input element
 * @param {*} type attribute type
 * @param {*} current current value
 * @return {*} the value
 */
function getAttributeValue(input, type, current) {
  let val;
  switch (type) {
    case 'Boolean': {
      val = input.checked;
      break;
    }
    case 'Integer': {
      val = parseInt(input.value);
      if (isNaN(val)) val = null;
      break;
    }
    case 'Double': {
      val = parseFloat(input.value);
      if (isNaN(val)) val = null;
      break;
    }
    case 'DateTime': {
      if (!/T/.test(current)) val = input.value.replace('T',' ');
      else val = input.value;
      break;
    }
    default: {
      val = input.value;
      break;
    }
  }
  return val;
};
