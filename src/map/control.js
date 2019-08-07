import ol_control_Attribution from 'ol/control/Attribution'
import ol_control_Button from 'ol-ext/control/Button'  
import ol_control_CanvasScaleLine from 'ol-ext/control/CanvasScaleLine'
import ol_control_SearchFeature from 'ol-ext/control/SearchFeature'
import ol_control_SearchGeoportail from 'ol-ext/control/SearchGeoportail'
import ol_control_SearchGeoportailParcelle from 'ol-ext/control/SearchGeoportailParcelle'
import ol_control_Disable from 'ol-ext/control/Disable'

import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_control_Toggle from 'ol-ext/control/Toggle'
import { getCenter as ol_extent_getCenter } from 'ol/extent'

import map from './map'
import config from '../config'

import ol_Feature from 'ol/Feature'
import ol_geom_Point from 'ol/geom/Point'
import ol_style_Style from 'ol/style/Style'
import ol_style_Circle from 'ol/style/Circle'
import ol_style_Stroke from 'ol/style/Stroke'
import {ol_featureAnimation_Zoom} from 'ol-ext/featureanimation/Zoom'
import {easeOut as ol_easing_easeOut} from 'ol/easing'

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
};

export default function(wapp) {
  // SearchGeoportail Control
  var locCtrl = new ol_control_SearchGeoportail({
    apiKey: config.apiKey, 
    authentication: config.auth,
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
    apiKey: config.apiKey, 
    authentication: config.auth,
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

  // Scale line
  map.addControl (new ol_control_CanvasScaleLine());

  // Disable control
  const disableCtrl = wapp.disableCtrl = new ol_control_Disable();
  map.addControl (disableCtrl);

    // Attribution
  // map.setAttributionsMode("logo")
  map.addControl (new ol_control_Attribution({ collapsible:false }));

  // Menu
  map.addControl (new ol_control_Toggle({
    "className": "menuCtrl needsclick", 
    "html": "<i class='fa fa-bars'></i>",
    "toggleFn": function(b){
      wapp.toggleMenu();
    }
  }));

  // Layer switcher
  var lswitcher = new ol_control_LayerSwitcher({ 
    target:$("#layerswitcher").get(0), 
    reordering: true
  });

  // Guichet info
  lswitcher.on('drawlist', function(e) {
    if (e.layer.get('name')==='guichet') {
      $('<div>').addClass('layerInfo')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .click(function(){
          wapp.showGuichetInfo(wapp.ripart.getGuichet());
        });
    }
  });

  map.addControl (lswitcher);

  /*
  // Geolocation Control
  var geoloc = window.geoloc = new ol.control.Geolocate();
  geoloc.on("geolocate", function(e) 
    {	centerMap(e.position);
    });
  map.addControl(geoloc);
  */
}
