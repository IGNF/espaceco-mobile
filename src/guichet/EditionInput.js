import ol_ext_element from 'ol-ext/util/element'
import EditionError from './EditionError'
import { dialog, selectDialog } from '../../cordovapp/cordovapp/dialog'

/** Listen change event
 * @param {Element} input
 * @param {function} listener
 */
function addChangeListener(input, listener) {
  ['keyup','change','input'].forEach((e) => {
    input.addEventListener(e, listener);
  });
}

/** An edition input
 * @param {*} ftype featureType attribute
 * @param {*} value
 * @param {Element} li
 * @param {*} update list of updated input
 */
const EditionInput = function (ftype, value, li, updated) {
  let inline = false;
  if (!li) {
    li = document.createElement('DIV')
    li.className = 'edit';
    inline = true;
  }
  if (updated) li.className = li.className + ' updated';
  this.ftype = ftype;
  this.value = value;

  // 
  var theme, title;
  var index = ftype.title.indexOf('@');
  if (index > -1) {
    theme = ftype.title.substring(0, index);
    title = ftype.title.substring(index+1);
  } else {
    theme = "hidden";
    title = ftype.title;
  }
  $(li).addClass(theme);

  // Label
  const label = ol_ext_element.create('LABEL', {
    html: title,
    parent: li
  });

  // Input
  let input;
  let val;
  let ktype = this.type = ftype.listOfValues ? 'Choice' : ftype.type;
  switch (ktype) {
    // Chaine de caractères
    case 'String': {
      input = ol_ext_element.create('INPUT', {
        value: value || '',
        parent: li
      });
      addChangeListener(input, () => {
        error.setError(ftype, input.value);
      });
      break;
    }
    // Boolean
    case 'Boolean': {
      input = ol_ext_element.create('INPUT', {
        checked: value,
        type: 'checkbox',
        parent: label
      });
      ol_ext_element.create('SPAN', {
        parent: label
      });
      addChangeListener(input, () => {
        error.setError(ftype, input.checked);
      });     
      break;
    }
    // Choice
    case 'Choice': {
      li.classList.add('Choice');
      input = ol_ext_element.create('INPUT', {
        value: value || '',
        disabled: "disabled",
        parent: li
      });
      if (ftype.listOfValues) {
        $(input).data('value', value || '');
        if (!ftype.listOfValues.forEach) {
          for (let i in ftype.listOfValues) {
            if (ftype.listOfValues[i] === value) input.value = i;
          }
        }
      }
      li.addEventListener('click', this.handleChoice.bind(this));
      addChangeListener(input, () => {
        error.setError(ftype, input.value);
      });
      break;
    }
    // Date
    case 'YearMonth':
    case 'Date': {
      val = value;
      if (ftype.type==='YearMonth' && val) {
        val = val.replace(/(\d+)-(\d+)-.*/,'$1-$2');
      }
      input = ol_ext_element.create('INPUT', {
        value: val || '',
        type: ftype.type==='Date' ? 'date' : 'month',
        parent: li
      });
      addChangeListener(input, () => {
        error.setError(ftype, input.value);
      });
      break;
    }
    // DateTime
    case 'DateTime': {
      val = value || '';
      if (!/T/.test(val)) val = val.replace(' ','T');
      input = ol_ext_element.create('INPUT', {
        value: val || '',
        type: 'datetime-local',
        parent: li
      });
      addChangeListener(input, () => {
        error.setError(ftype, input.value);
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
        value: value===null ? '' : value,
        type: type, 
        parent: li
      });
      addChangeListener(input, () => {
        if (type==='tel') input.value = input.value.replace(/,/g,'.'); // format anglais avec '.' plutot que ','
        error.setError(ftype, input.value);
      });
      break;
    }
    // Geometry
    case 'Point':
    case 'LineString':
    case 'Polygon':
    case 'MultiPolygon': {
      break;
    }
    // Inconnu / non traite
    case 'JsonValue': 
    case 'Document': 
    case 'Like': 
    default: {
      ol_ext_element.create('INPUT', {
        value: value || '',
        readOnly: 'readOnly',
        parent: li
      });
      break;
    }
  }

  // Gestion des erreurs
  const error = new EditionError(li, inline);

  // The input
  this.input = input;
  if (input) {
    ['keyup','change','input'].forEach((k) => {
      input.addEventListener(k, () => {
        console.log('change')
        this.changed = true;
      });
    });
  }
};

/** Handle input choice
 */
EditionInput.prototype.handleChoice = function(cback) {
  const values = {};
  if (this.ftype.listOfValues) {
    if (this.ftype.listOfValues.forEach) {
      this.ftype.listOfValues.forEach((v) => {
        //if (v===null) values[''] = '<i>indéfini</i>';
        //else values[v] = v;
        values[v] = v;
      });
    } else {
      for (let i in this.ftype.listOfValues) {
        values[this.ftype.listOfValues[i]] = i;
      }
    }
    selectDialog(values, $(this.input).data('value'), (val) => {
      this.input.value = values[val];
      $(this.input).data('value', val);
      this.changed = true;
      if (typeof(cback) === 'function') cback(val);
    });
  }
};

/** Is valid and has changed
 * @return {boolean}
 */
EditionInput.prototype.hasChanged = function() {
  return this.changed===true;
  /*
  if (!this.input) return false;
  else return true;
  */
};

/** Prompt the input
 */
EditionInput.prototype.prompt = function(cback) {
  switch (this.type) {
    // Prompt the choice
    case 'Choice': {
      this.handleChoice(cback);
      break;
    }
    // Handle boolean
    case 'Boolean': {
      this.input.click();
      cback(this.val());
      break;
    }
    // Prompt dialog
    default: {
      dialog.show(this.input.parentNode, {
        className: 'edition',
        buttons: { submit:'ok', cancel: 'annuler' },
        callback: (b) => {
          if (b==='submit') {
            if (/error/.test(this.input.parentNode.className)) {
              dialog.show(null, { anim: false });
            } else {
              cback(this.val());
            }
          }
        }
      });
      setTimeout (() => {
        const v = this.input.value;
        this.input.value = '';
        this.input.focus();
        this.input.value = v;
      }, 0);
    }
  }
};

/** Get the value in the input according to its type
 * @return {*} the value
 */
EditionInput.prototype.val = function() {
  const type = this.ftype.listOfValues ? 'Choice' : this.ftype.type;
  const input = this.input;
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
    case 'YearMonth':
    case 'Date': {
      if (!input.value) val = null;
      else val = input.value;
      break;
    }  
    case 'DateTime': {
      if (input.value) val = input.value.replace('T',' ');
      else val = input.value || null;
      break;
    }
    case 'Choice': {
      val = $(input).data('value');
      if (!val) val = null;
      break;
    }
    case 'String': {
      if (this.ftype.nullable && !input.value) {
        if (!this.value) val = this.value;
        else val = null;
      } else {
        val = input.value;
      }
      break;
    }
    default: {
      val = input.value;
      break;
    }
  }
  return val;
};

export default EditionInput
