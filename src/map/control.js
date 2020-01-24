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
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import ol_ext_element from 'ol-ext/util/element'

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

/** Initialize map controls
 */
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
    "toggleFn": function(){
      wapp.toggleMenu();
    }
  }));

  // Selecteur Guichets
  const guichetlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: document.querySelector('#layer-guichet .layerswitcher.online'), 
    reordering: true,
    layerGroup: wapp.getLayerGuichet()
  });
  map.addControl (guichetlayerSwitcher);
  guichetlayerSwitcher.on('drawlist', (e) => {
    var layer = e.layer;
    if (wapp.getIdGuichet() + '-0' === layer.get('name')) {
      e.li.classList.add('online');
    } else {
      e.li.classList.add('offline');
    }
    e.li.classList.add('visible');
    if (layer.getLayers) {
      // Force expend
      layer.set('openInLayerSwitcher', true);
      // Hide 
      if (!e.layer.getVisible()) e.li.classList.remove('visible');
    }
    console.log(layer)
    // Boutons
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // VectorCache
    if (layer.get('cache')) {
      ol_ext_element.create('I', {
        className: 'fa fa-pencil',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-refresh',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-cloud-download',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
      ol_ext_element.create('I', {
        className: 'fa fa-gear',
        click: () => {
          console.log(layer)
        },
        parent: div
      });
    }
    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        console.log(layer)
      },
      parent: div
    });
  });
  // Gestion de la visibilite
  var toggle = document.querySelector('#layer-guichet .guichet .toggle input');
  toggle.addEventListener('change', () => {
    var layer = wapp.getLayerGuichet();
    if (layer.getLayers) {
      if (toggle.checked) {
        layer.getLayers().item(1).setVisible(false);
        layer.getLayers().item(0).setVisible(true);
      } else {
        layer.getLayers().item(1).setVisible(true);
        layer.getLayers().item(0).setVisible(false);
      }
    }
  });
  wapp.getLayerGuichet().on('change', () => {
    setTimeout(() => {
      var layer = wapp.getLayerGuichet();
      if (layer.getLayers) {
        var layers = layer.getLayers();
        if (!layers.item(0).getVisible() && !layers.item(1).getVisible()) {
          layers.item(1).setVisible(true);
        }
        toggle.checked = layers.item(0).getVisible();
      }
    }, 0);
  });

  // Selecteur Carte utilisateur
  $('#layer-carte').on('showpage', () => {
    var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
    if (lgroup.getLayers().getLength()) {
      $('#layer-carte').addClass('hascarte');
    } else {
      $('#layer-carte').removeClass('hascarte');
    }
  });
  const userlayerSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-carte .layerswitcher").get(0), 
    reordering: true,
    layerGroup: wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' })
  });
  userlayerSwitcher.on('drawlist', (e) => {
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // Info sur la carte
    ol_ext_element.create('I', {
      className: 'fa fa-info-circle',
      click: () => {
        var content = CordovApp.template('dialog-infocarte');
        wapp.dataAttributes(content, e.layer.getProperties());
        console.log( e.layer.getProperties())
        wapp.dialog.show (content, {
          buttons: { ok:'ok' }
        });
      },
      parent: div
    });
  });
  map.addControl (userlayerSwitcher);

  // Selecteur fond geoportail
  const geoportailSwitcher = new ol_control_LayerSwitcher({ 
    target: $("#layer-geoportail .layerswitcher").get(0), 
    reordering: true,
    displayInLayerSwitcher: (l) => {
      return (
        (/DFCI|cache|Fond\ de\ plan/.test(l.get('name')) || l instanceof ol_layer_Geoportail)
        && 
        l.get('displayInLayerSwitcher') !== false
      );
    }
  });
  geoportailSwitcher.on('drawlist', (e) => {
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    // Gestion du cache geoportail
    if (e.layer.get('name') === 'cache') {
      e.li.className += ' cache';
      // Add
      if (wapp.ripart.param.offline) {
        ol_ext_element.create('I', {
          className: 'fa fa-plus-circle',
          click: () => {
            wapp.cache.addCacheMap();
          },
          parent: div
        });
      }
      // Info sur la carte
      ol_ext_element.create('I', {
        className: 'fa fa-info-circle',
        click: () => {
          var content = CordovApp.template('dialog-infocache');
          content.addClass(wapp.ripart.param.offline ? 'offline' : 'online');
          wapp.dialog.show (content, {
            title: 'Mode hors-ligne',
            buttons: { ok:'ok' }
          });
        },
        parent: div
      });
    } else if (e.layer.get('cacheMap')) {
      // Carte en cache
      const smap = e.layer.get('cacheMap');
      ol_ext_element.create('P', {
        html: smap.date,
        parent: div
      });
      // Refresh
      ol_ext_element.create('I', {
        className: 'fa fa-refresh',
        click: () => {
          wapp.cache.refreshCacheMap(smap);
        },
        parent: div
      });
      // Download
      ol_ext_element.create('I', {
        className: 'fa fa-cloud-download',
        click: () => {
          wapp.cache.loadCacheMap(smap);
        },
        parent: div
      });
      // Options
      ol_ext_element.create('I', {
        className: 'fa fa-gear',
        click: () => {
          wapp.prompt('Nom de la carte', smap.nom, (name) => {
            if (name) {
              smap.nom = name;
              e.layer.set('title', name);
            }
          });
        },
        parent: div
      });
      // Suppr
      ol_ext_element.create('I', {
        className: 'fa fa-trash',
        click: () => {
          wapp.cache.removeCacheMap(smap);
        },
        parent: div
      });
      // Info sur la carte
      ol_ext_element.create('I', {
        className: 'fa fa-info-circle',
        click: () => {
          var content = CordovApp.template('dialog-infomap');
          var layerName = new ol_layer_Geoportail(smap.layer).get('name')
          var att = $.extend({ name: layerName }, smap);
          wapp.dataAttributes(content, att);
          $('.centermap', content).get(0).addEventListener('click', () => {
            wapp.map.getView().fit(smap.extent, wapp.map.getSize());
            wapp.hidePage();
            wapp.dialog.close();
          });
          $('.loadmap', content).get(0).addEventListener('click', () => {
            wapp.cache.loadCacheMap(smap);
            wapp.dialog.close();
          });
          wapp.dialog.show (content, {
            title: e.layer.get('title'),
            buttons: { ok:'ok' }
          });
        },
        parent: div
      });
    } else if (e.layer.get('desc')) {
      // Description
      ol_ext_element.create('I', {
        className: 'fa fa-info-circle',
        click: () => {
          wapp.message(e.layer.get('desc'), '<i class="fa fa-info-circle fa-2x"></i> '+e.layer.get('title'));
        },
        parent: div
      });
    }
  });
  
  map.addControl (geoportailSwitcher);

  // Acces aux couches
  map.addControl (new ol_control_Toggle({
    className: 'switcher',
    html: '<i class="fa tools-layerstack"></i>',
    onToggle: () => {
      wapp.togglePage('couches');
    }
  }));

/* OLD VERSION */
  // Layer switcher
  var lswitcher = new ol_control_LayerSwitcher({ 
    target:$("#layerswitcher").get(0), 
    reordering: true
  });

  // Guichet info
  lswitcher.on('drawlist', function(e) {
    if (e.layer.get('cache')) {
      $('<div>').addClass('nb')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .html (e.layer.getSource().nbModifications());
    }
    if (e.layer.get('name')==='guichet') {
      $('<div>').addClass('layerInfo')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .click(function(){
          wapp.showGuichetInfo(wapp.ripart.getGuichet());
        });
    }
    if (e.layer.get('vectorCache')) {
      $('<div>').addClass('layerSynchro')
        .appendTo($('.ol-layerswitcher-buttons', e.li).first())
        .click(() => {
          wapp.vectorCache.saveLayer(e.layer.getLayers().getArray().slice(), e.layer.get('vectorCache'))
        });
    }
  });

  map.addControl (lswitcher);
/* END OLD */

  /*
  // Geolocation Control
  var geoloc = window.geoloc = new ol.control.Geolocate();
  geoloc.on("geolocate", function(e) 
    {	centerMap(e.position);
    });
  map.addControl(geoloc);
  */

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
