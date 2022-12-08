/*eslint no-useless-escape: "off"*/
import './EditionError.css'

import ol_ext_element from 'ol-ext/util/element'
import {alertDlg} from 'cordovapp/cordovapp/dialog'

/** Gestion des erreurs et contraintes de saisie
 * @constructor
 * @param {Element} li element auquel ajouter l'icone d'erreur
 * @param {boolean} inline show error inline
 */
const EditionError = function(li, inline) {
  this.error = '';
  this.li = li;
  this.inline = inline;
  // Ajouter une icone en cas d'erreur
  this.element = ol_ext_element.create('DIV', {
    className: 'inputError',
    click: () => this.show(),
    parent: li
  });  
};

/** Afficher l'erreur dans un dialog 
 */
EditionError.prototype.show = function() {
  if (this.error && !this.inline) {
    alertDlg(this.error);
  }
};

/** Gestion des erreurs et contraintes de saisie
 * @param {*} column table attribute
 * @param {*} value
 * @private
 */
EditionError.prototype.setError = function(column, value) {
  this.error = this._getError(column, value);
  if (this.inline) this.element.innerText = this.error;
  if (this.error) {
    console.log('setError', column, value)
    this.li.classList.add('error');
  }
  else {
    this.li.classList.remove('error');
  }
};

/** Gestion des erreurs et contraintes de saisie
 * @param {*} column
 * @param {*} value
 * @private
 */
EditionError.prototype._getError = function(column, value) {
  const att = column.name;
  switch (column.type) {
    case 'String': {
      if (column.max_length && value.length > column.max_length) {
        return ('Chaine trop longue ('+column.max_length+' caractères maxi.)...');
      } else if (column.min_length && value.length < column.min_length) {
        return ('Chaine trop courte ('+column.min_length+' caractères mini.)...');
      }
      break;
    }
    case 'Year':
    case 'Integer':
    case 'Double': {
      // Valeur null autorisee
      if (value!==0 && !value && column.nullable) break;
      // Nombre valide
      if ((value!==0 && !value) || isNaN(Number(value))) {
        if (column.type==='Year') {
          return ('"'+att+'" doit être une année...');
        }
        return ('"'+att+'" doit être un nombre valide...');
      } else if (column.type === 'Integer' && parseInt(value) !== parseFloat(value)) {
        return ('"'+att+'" doit être un entier...');
      } else if (column.min_value && parseFloat(value) < column.min_value) {
        if (column.min_value === 0) return ('"'+att+'" doit être positif...');
        else return ('Valeur trop petite ( > '+column.min_value+')...');
      } else if (column.max_value  && parseFloat(value) > column.max_value ) {
        return ('Valeur trop grande ( < '+column.max_value +')...');
      }
      break;
    }
  }
  // Non nulle
  if (column.nullable === false && value==='') {
    return ('Vous devez entrer une valeur...');
  }
  // required 
  if (column.required && value==='') {
    return ('Champ obligatoire...');
  }
  // pattern  
  if (column.pattern && !(new RegExp(column.pattern)).test(value) && value !== '') {
    switch (column.pattern) {
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
        return ('La valeur doit être de la forme : '+column.pattern);
    }
  }
  return '';
};

export default EditionError