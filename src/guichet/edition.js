import wapp from '../wapp'

import ol_ext_element from 'ol-ext/util/element'

/** Ajouter une nouvelle ligne a éditer
 * @param {Element} ul liste element
 * @param {ol.Feature} feature current feature
 * @param {*} ftype featureType attribute
 * @param {number} att current attribut name
 */
function _addLine (ul, feature, ftype, att) {
  // if (ftype.readOnly) return;
  console.log(ftype);
  const li = ol_ext_element.create('LI', {
    parent: ul
  });
  ol_ext_element.create('LABEL', {
    html: ftype.title,
    parent: li
  });
  ol_ext_element.create('INPUT', {
    value: feature.get(att),
    parent: li
  });

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
  for (i in ftype.attributes) if (i !== ftype.geometryName && feature.get(i)) {
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
