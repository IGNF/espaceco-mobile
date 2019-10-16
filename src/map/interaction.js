import map from './map'
import ol_Feature from 'ol/Feature'
import ol_interaction_Select from 'ol/interaction/select'
import ol_interaction_LongTouch from 'ol-ext/interaction/LongTouch'
import ol_style_Style from 'ol/style/Style'
import ol_style_Stroke from 'ol/style/Stroke'
import ol_style_Fill from 'ol/style/Fill'
import ol_style_Circle from 'ol/style/Circle'

import ol_layer_Vector from 'ol/layer/Vector'
import ol_source_Vector from 'ol/source/Vector'
import ol_geom_LineString from 'ol/geom/LineString'
import ol_geom_MultiLineString from 'ol/geom/MultiLineString'
import ol_geom_MultiPoint from 'ol/geom/MultiPoint'
import ol_geom_MultiPolygon from 'ol/geom/MultiPolygon'
import ol_geom_Point from 'ol/geom/Point'
import ol_geom_Polygon from 'ol/geom/Polygon'
import ol_control_GeolocationBar from 'ol-ext/control/GeolocationBar'

import {click as ol_events_condition_click} from 'ol/events/condition'
import {get as ol_proj_get} from 'ol/proj'

// Style pour les traces 
var redStroke = new ol_style_Stroke({ color: "#f00", width: 2 });
var whiteStroke = new ol_style_Stroke({ color: [255,255,255,0.8], width: 5 });
var redFill = new ol_style_Fill({ color: [255,0,0,0.5] });
const redStyle = [
  new ol_style_Style ({
    image: new ol_style_Circle ({ stroke: whiteStroke, fill: redFill, radius: 5 }),
    stroke: whiteStroke,
    fill: redFill
  }),
  new ol_style_Style ({
    image: new ol_style_Circle ({ stroke: redStroke, radius: 5 }),
    stroke: redStroke
  })
];

/* Set interactions */
export default function(wapp) {
  wapp.interactions = {};
  wapp.overlays = {};
  //	Selection
  wapp.select = new ol_interaction_Select({
    multi: true,
    hitTolerance: 5,
    condition: ol_events_condition_click,
    filter: function(f) {	
      return (f.layer || f.get('georem') || f.get('ripart') || f.get('features'));
    },
    style: redStyle
  });
  wapp.select.selectFeature = function(f) {
    this.getFeatures().clear();
    if (f) this.getFeatures().push(f);
    wapp.showSelect();
  };
  map.addInteraction(wapp.select);

  /** Afficher la selection dans la barre et la fiche
   */
  wapp.onSelect = function() {
    var nb = wapp.select.getFeatures().getLength();
    // wapp.ripart.cancelFormulaire();
    if (nb>1) {
      $("#selection").html (nb + ' objets sélectionnés...');
      wapp.showOnglet("info");
    }
    else if (nb===1) {
      var f = wapp.select.getFeatures().item(0);
      $("#selection").html (f.get("nom")||"Afficher la sélection...");
      wapp.showOnglet("info");
    }
    else
    {	$("#selection").html ("");//("<i>"+$("#selection").data("placeholder")+"</i>");
      //wapp.showOnglet("signal");
    }
    if (wapp.isPage("fiche")) wapp.showSelect();
  };
  wapp.select.on("select", wapp.onSelect.bind(wapp));
  wapp.onSelect();

  // getFeatureInfo interaction
  function getFeatureInfo(l, coord) {
    if (!l.getSource().getGetFeatureInfoUrl) return;
    var	url = l.getSource().getGetFeatureInfoUrl(
      coord, 
      map.getView().getResolution(),
      map.getView().getProjection(),
      { info_format: "application/json" }
    );
    var t = new Date();
    $.ajax(url, {
      dataType: "json",
      success: function(resp) {
        var f = resp.features[0];
        if (f) {
          var crs = resp.crs.properties.name.replace(/(.*)EPSG::(\d*)$/, "$2");
          var proj = ol_proj_get("EPSG:"+crs);
          if (proj) {
            let geom;
            switch (f.geometry.type) {
              case 'Point': {
                geom = new ol_geom_Point(f.geometry.coordinates);
                break;
              }
              case 'LineString': {
                geom = new ol_geom_LineString(f.geometry.coordinates);
                break;
              }
              case 'Polygon': {
                geom = new ol_geom_Polygon(f.geometry.coordinates);
                break;
              }
              case 'MultiPoint': {
                geom = new ol_geom_MultiPoint(f.geometry.coordinates);
                break;
              }
              case 'MultiLineString': {
                geom = new ol_geom_MultiLineString(f.geometry.coordinates);
                break;
              }
              case 'MultiPolygon': {
                geom = new ol_geom_MultiPolygon(f.geometry.coordinates);
                break;
              }
              default: {
                console.warn('Unknown geometry type ('+f.geometry.type+')');
                break;
              }
            }
            if (geom) {
              geom.transform(proj, map.getView().getProjection());
              var feature = new ol_Feature(geom);
              feature.layer = l;
              delete f.geometry;
              delete f.properties.bbox;
              feature.setProperties(f.properties);
              setTimeout(
                function(){
                  wapp.select.getFeatures().push(feature);
                  wapp.onSelect({ selected:[feature] });
                }, Math.max(0, 400+(t-(new Date())))
              )
            }
          }
        }
      }
    });
  }
  map.on ('click', function(e) {
    if (!wapp.select.getFeatures().length) {
      // Test pixel at position
      wapp.map.forEachLayerAtPixel(e.pixel, function(layer) {
        getFeatureInfo(layer, e.coordinate);
      });
    }
  });

  // Longtouch
  map.addInteraction(new ol_interaction_LongTouch({
    handleLongTouchEvent: function(e) {
      wapp.select.getFeatures().clear();
      map.getView().setCenter(e.coordinate);
      wapp.ripart.showFormulaire();
    }
  }));

  /* Ajout de la barre de geolocalisation */
  // Geolocation draw
  var geodrawlayer = new ol_layer_Vector({
    name: 'Trace',
    title: 'Trace',
    geolocation: true,
    visible: true,
    displayInLayerSwitcher: false,
    source: new ol_source_Vector(),
    style: [
      new ol_style_Style({
        stroke: new ol_style_Stroke ({ color: [255, 255, 255, 0.8], width: 5 })
      }),
      new ol_style_Style({
        stroke: new ol_style_Stroke ({ color: [0, 153, 255, 1], width: 3 })
      })
    ]
  });
  wapp.overlays.gps = geodrawlayer;
  geodrawlayer.getSource().on('addfeature', function(e) { 
    console.log('addFeature')
    e.feature.layer = geodrawlayer;
    wapp.help.show('main-trace'); 
  });
  map.addLayer(geodrawlayer);

  // Bar de geolocalisation
  var geolocBar = new ol_control_GeolocationBar({
    centerLabel: 'recentrer',
    source: geodrawlayer.getSource(),
    type: 'LineString',
    followTrack: 'auto',
    tolerance: wapp.param.options.toleranceGPS||5,
    minAccuracy: wapp.param.options.minGPSAccuracy||20
  });
  map.addControl(geolocBar);
  wapp.interactions.geolocation = geolocBar.getInteraction();
  wapp.interactions.geolocation.on('change:active', function(e){
    wapp.help.show('main-geolocation');
    if (!e.oldValue && wapp.map.getView().getZoom()<17) {
      wapp.map.getView().setZoom(17);
    }
  });
}
