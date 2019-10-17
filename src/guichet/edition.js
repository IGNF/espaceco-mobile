import wapp from '../wapp'

/** Ajouter une nouvelle ligne a éditer
 * @param {Element} ul liste element
 * @param {*} att featureType attribute
 * @package {*} current valules
 */
function _addLine (ul, att) {

};

 
wapp.editFeature = function() {
  const feature = this.select.getFeatures().item(0);
  if (!feature) return;

  const div = $('#fiche .selection').removeClass("multi");
  const prop = feature.getProperties();
  const ftype = feature.layer.getFeatureType();
  
  const ul = $(".fiche ul", div).html('');
  const th = $(".fiche .themes", div).html("");
  
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
        _addLine(ul, att, feature.get(i));
        break;
      }
    }
  }
};
