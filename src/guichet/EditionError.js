/*eslint no-useless-escape: "off"*/
import './EditionError.css'

import ol_ext_element from 'ol-ext/util/element'
import {alertDlg} from '../../cordovapp/cordovapp/dialog'

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
 * @param {FeatureType} ftype
 * @param {*} value
 * @private
 */
EditionError.prototype.setError = function(ftype, value) {
  this.error = this._getError(ftype, value);
  if (this.inline) this.element.innerText = this.error;
  if (this.error) {
    console.log('setError', ftype, value)
    this.li.classList.add('error');
  }
  else {
    this.li.classList.remove('error');
  }
};

/** Gestion des erreurs et contraintes de saisie
 * @param {FeatureType} ftype
 * @param {*} value
 * @private
 */
EditionError.prototype._getError = function(ftype, value) {
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
      // Valeur null autorisee
      if (value!==0 && !value && ftype.nullable) break;
      // Nombre valide
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
};

export default EditionError