/*global wapp*/
import ol_control_Button from 'ol-ext/control/Button'
import ol_control_SearchFeature from 'ol-ext/control/SearchFeature'
import ol_control_SearchGeoportail from 'ol-ext/control/SearchGeoportail'
import ol_control_SearchGeoportailParcelle from 'ol-ext/control/SearchGeoportailParcelle'
import ol_control_SearchGPS from 'ol-ext/control/SearchGPS'

import ol_Feature from 'ol/Feature'
import ol_geom_Point from 'ol/geom/Point'
import ol_style_Style from 'ol/style/Style'
import ol_style_Circle from 'ol/style/Circle'
import ol_style_Stroke from 'ol/style/Stroke'
import {ol_featureAnimation_Zoom} from 'ol-ext/featureanimation/Zoom'
import {easeOut as ol_easing_easeOut} from 'ol/easing'
import {getCenter as ol_extent_getCenter} from 'ol/extent'

import map from '../map'
import config from '../../config'

// Center and pulse at coord
function centerMap(coord) {
  map.getView().setCenter(coord);
  if (map.getView().getZoom()<15) map.getView().setZoom(15);
  for (let i=0; i<3; i++) {
    setTimeout(() => {
      var f = new ol_Feature (new ol_geom_Point(coord));
      f.setStyle (new ol_style_Style({
        image: new ol_style_Circle ({
          radius: 30,
          stroke: new ol_style_Stroke ({ color: 'red', width: 3 })
        })
      }));
      map.animateFeature (f, new ol_featureAnimation_Zoom({
        fade: ol_easing_easeOut,
        duration: 3000,
        easing: ol_easing_easeOut
      }));
    }, i*1000);
  }
}

export default function() {
// SearchGeoportail Control
  var locCtrl = new ol_control_SearchGeoportail({
    apiKey: 'essentiels',
    // authentication: config.auth,
    placeholder: "rechercher...",
    target: $('#search [data-role="onglet-li"][data-list="adress"]').get(0)
  });
  locCtrl.set('copy', null);
  locCtrl.on('select', function(e) {
    centerMap(e.coordinate);
    wapp.hidePage();
  });
  map.addControl (locCtrl);

  // Search button
  var searchCtrl = new ol_control_Button({
    className: "searchCtrl needsclick",
    html: "<i class='fa fa-search'></i>",
    handleClick: function() {
      wapp.showPage('search');
      // Focus on first input
      setTimeout( function(){
        $("#search > div div:visible input.search").first().focus();
      }, 100);
    }
  });
  map.addControl (searchCtrl);

  // Search Parcelle
  var searchParcel = new ol_control_SearchGeoportailParcelle({
    apiKey: 'essentiels',
    // authentication: config.auth,
    target: $('#search [data-role="onglet-li"][data-list="parcel"]').get(0)
  });
  map.addControl(searchParcel);
  searchParcel.on('parcelle', function (e) {
    centerMap(e.coordinate);
    wapp.hidePage();
  });
  // Focus on input
  $('#search [data-role="onglet-li"]').on('showonglet', function(e){
    setTimeout (function(){ $('.search', e.target).focus();}, 0);
  });

  // Se centrer par coordonnées
  var searchCoord = new ol_control_SearchGPS({
    target: $('#search [data-role="onglet-li"][data-list="coordinates"]').get(0)
  });
  map.addControl(searchCoord);
  searchCoord.on('select', function(e){
    // console.log(e);
    map.getView().animate({
      center: e.search.coordinate,
      zoom: Math.max (map.getView().getZoom(), 17)
    });
  });

  // Search feature
  var searchFeature = new ol_control_SearchFeature({
    placeholder: 'chercher une donnée...',
    target: $('#search [data-role="onglet-li"][data-list="data"]').get(0),
    maxItems: 50
  });
  map.addControl(searchFeature);
  searchFeature.on('select', function (e) {
    wapp.select.getFeatures().clear();
    wapp.select.getFeatures().push(e.search);
    wapp.onSelect({ selected: [e.search] });
    wapp.hidePage();
    wapp.map.getView().setCenter(ol_extent_getCenter(e.search.getGeometry().getExtent()));
  });
  $('#search [data-role="onglet-li"][data-list="data"] .wapp-search').click(function(){
    searchFeature.setInput('*',true); searchFeature.setInput('')
  });

  /** Definir la source pour la recherche
   * @param {ol.source.Vector} source
   */
  wapp.setSearchSource = function(source, prop) {
    if (source && prop) {
      var ctrl;
      wapp.map.getControls().forEach(function (c) {
        if (c instanceof ol_control_SearchFeature) {
          ctrl = c;
        }
      });
      if (ctrl) {
        $('#search').removeClass('noOnglet');
        ctrl.setSource(source);
        ctrl.set('property', prop);
      }
      return true;
    } else {
      // Pas de recherche > recherche adresse
      wapp.showOnglet('adress');
      $('#search').addClass('noOnglet');
      return false;
    }
  };

  wapp.setSearchSource();
}
