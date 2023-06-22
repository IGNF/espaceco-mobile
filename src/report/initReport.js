import Report from 'cordovapp/report/ReportForm'
import UserManagerTemplating from 'cordovapp/collaboratif/UserManagerTemplating'
import map from '../map/map'
import {ApiClient} from 'collaboratif-client-api';

import ol_layer_Vector from 'ol/layer/Vector'
import ol_style_Style from 'ol/style/Style'
import ol_style_Stroke from 'ol/style/Stroke'
import ol_source_Vector from 'ol/source/Vector'
import ol_layer_Group from 'ol/layer/Group'
import {transform as ol_proj_transform} from 'ol/proj'
import {fromLonLat as ol_proj_fromLonLat} from 'ol/proj'
import {getCenter as ol_extent_getCenter} from 'ol/extent'
import {boundingExtent as ol_extent_boundingExtent} from 'ol/extent'
import {buffer as ol_extent_buffer} from 'ol/extent'

import ol_control_LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import ol_ext_element from 'ol-ext/util/element'
import { messageDlg } from 'cordovapp/cordovapp/dialog'
import { waitDlg } from 'cordovapp/cordovapp/dialog'

/** 
 * Initialisation des signalements
 */
function initReport(wapp) {
  // Couche pour les signalements
  var layer = new ol_layer_Vector({
    source: new ol_source_Vector(),
    title: "Mes Signalements",
    name: "MesSignalements",
    zIndex: Infinity
  });
  layer.setVisible(wapp.param.visibleLayers.MesSignalements);

  // Couche pour les croquis
  var layerCroquis = new ol_layer_Vector({
    source: new ol_source_Vector(),
    title: 'Croquis',
    name: 'Croquis',
    zIndex: Infinity,
    style: new ol_style_Style({
      stroke: new ol_style_Stroke ({ color: [0, 153, 255, 1], width: 6 })
    })
  });
  layerCroquis.setVisible(wapp.param.visibleLayers.Croquis);

  const group = new ol_layer_Group({
    name: 'signalementGroup',
    visible: wapp.param.visibleLayers.signalementGroup,
    layers: [
      layerCroquis,
      layer
    ]
  });
  map.addLayer(group);

  // Layer switcher
  const layerSwitcher = new ol_control_LayerSwitcher({ 
    target: document.querySelector('#layer-signalement .layerswitcher'), 
    reordering: false,
    layerGroup: group
  });
  map.addControl(layerSwitcher);

  // None is visible ?
  layerSwitcher.on('layer:visible', () => {
    let vis = false;
    group.getLayers().forEach((l)=> {
      vis = vis || l.getVisible();
    })
    group.setVisible(vis);
  })

  // Icon bar
  layerSwitcher.on('drawlist', (e) => {
    const div = ol_ext_element.create('DIV', {
      className: 'icn-bar',
      parent: e.li
    });
    wapp.report.countElement = $('.georemsCount span');
    switch (e.layer.get('name')) {
      case 'MesSignalements': {
        ol_ext_element.create('i', {
          className: 'fa fa-refresh',
          click: () => {
            wapp.report.updateLocalRems();
          },
          parent: div
        });
        var c = wapp.report.countLocalRems();
        ol_ext_element.create('i', {
          className: 'fa fa-send',
          html: '<div class="georemsCount tag"><span>'+c+'</span></div>',
          click: () => {
            wapp.report.postAllLocalRems();
          },
          parent: div
        });
        ol_ext_element.create('i', {
          className: 'fa fa-gear',
          click: () => {
            wapp.showPage('signalements');
          },
          parent: div
        });
        // Info
        ol_ext_element.create('i', {
          className: 'fa fa-info-circle',
          click: () => {
            wapp.showDialog('dialog-info-mes-signalements', { className: 'signalements'});
          },
          parent: div
        });
        break;
      }
      case 'Croquis': {
        // Info
        ol_ext_element.create('i', {
          className: 'fa fa-info-circle',
          click: () => {
            wapp.showDialog('dialog-info-croquis');
          },
          parent: div
        });
        break;
      }
      case 'Signalements': {
        // Filter
        ol_ext_element.create('i', {
          className: 'fa fa-filter',
          click: () => {
            wapp.filterGeorem();
          },
          parent: div
        });
        // Info
        ol_ext_element.create('i', {
          className: 'fa fa-info-circle',
          click: () => {
            wapp.showDialog('dialog-info-report');
          },
          parent: div
        });
        break;
      }
    }
    
  });


  // Show / hide layer
  const eye = $('#couches .signalements .fa-eye').on('click', (e) => {
    e.stopPropagation();
    group.setVisible(!group.getVisible());
  });
  const eye2 = $('#layer-signalement h3 .fa-eye').on('click', () => {
    group.setVisible(!group.getVisible());
  });
  const setVisibility = function() {
    if (group.getVisible()) {
      eye.removeClass('fa-eye-slash');
      eye2.removeClass('fa-eye-slash');
    } else {
      eye.addClass('fa-eye-slash');
      eye2.addClass('fa-eye-slash');
    }
  };
  group.on('change:visible', setVisibility);
  setVisibility();
  
  var url = wapp.param.options.qlf || process.env.BASE_API_URL;
  let authParams = wapp.getAuthParameters(url);

  // Report
  let apiClient = new ApiClient(url, authParams.authBaseUrl, authParams.clientId, authParams.clientSecret);
  wapp.userManager = new UserManagerTemplating(apiClient, {
    infoElement: '#options .connect span.connected' //[data-input-role="info"]
  })
  $(() => {
    wapp.userManager.initialize();

    if (wapp.userManager.getUser()) {
      wapp.report.formElement.addClass("connected");
    }
    if (wapp.userManager.param.active_community) {
      wapp.report.setProfil(wapp.userManager.param.active_community);
      let community = wapp.userManager.getGroupById(wapp.userManager.param.active_community);
      wapp.changeGroup(community);
    }
    $(document).on("changegroup", function(e){
      wapp.changeGroup(e.community);
      wapp.report.setProfil(e.community);      
    });
    $(document).on("api_connect", function(e){
      wapp.report.formElement.addClass("connected");
    });
    $(document).on("api_disconnect", function(e){
      wapp.report.setProfil();
      wapp.report.param = { georems:[], nbrem:0 };
      wapp.report.saveParam();
      wapp.report.formElement.removeClass("connected");
    });
  });
  wapp.report = new Report(apiClient, {
    map: map,
    countElement: '.georemsCount span',
    listElement: '#signalements [data-role="content"]',
    formElement: '#fiche .signaler',
    layer: layer,
    croquis: layerCroquis,
    // Formatage du signalement / verification avant envoie
    formatGeorem: function(georem /*, form*/) {
      if (!georem.theme && $('#fiche .signaler [data-param="theme"] [data-input-role="option"]').length > 2) {
        wapp.alert ("Merci de choisir un thème...");
        return false;
      }
      if (!georem.comment) {
        wapp.alert ("Merci de laisser un commentaire...");
        return false;
      }
      // Forcer la jointure avec un objet d'une couche vecteur
      var proj = wapp.map.getView().getProjection();
      for (var i=0, l; l = wapp.vector[i]; i++) {
        // Jointure ?
        if (l.get('attach')) {
          var coord = ol_proj_fromLonLat([georem.lon,georem.lat], proj);
          var extent = ol_extent_buffer (ol_extent_boundingExtent([coord]), .1);
          var k, f, features = l.getSource().getFeaturesInExtent(extent);
          for (k=0; f=features[k]; k++) {
            var geom = f.getGeometry();
            if (geom.intersectsCoordinate && geom.intersectsCoordinate(coord)) {
              break;
            }
          }
          if (!f) f = l.getSource().getClosestFeatureToCoordinate(coord);
          if (f) {
            // Verifie pas deja joint
            var currentFeatures = wapp.report.selectOverlay.getSource().getFeatures();
            var found = false;
            for (k=0; k<currentFeatures.length; k++) {
              var props = currentFeatures[k].getProperties();
              // Propritete differente de geometry ?
              var eq = (Object.entries(props).length > 1);
              // Existant ?
              for (var p in props) if (p!=='geometry') {
                if (/^undefined$|^null$/.test(props[p])){
                  eq = eq && /^undefined$|^null$/.test(f.get(p));
                }
                else {
                  eq = eq && (String(props[p])==f.get(p));
                }
              }
              if (eq) {
                found = true;
                break;
              }
            }
            if (!found) {
              currentFeatures.push(f);
              georem.sketch = wapp.report.feature2sketch(currentFeatures, proj);
              break;
            }
          }
        }
      }
      // Protocol
      georem.protocol = "_MONGUICHET_65876";
      georem.version = "0.1";
      return true;
    }
  });

  /**
   * post des georems locales sans interruption en cas d erreur
   * @param {*} options
   *  @param {function} onPost a function called when a georem is posted
   */
  wapp.report.postAllLocalRems = function(options) {
    options = options || {};
    var self = this;
    var nb = this.countLocalRems();
    var n = 0;
    var nbErrors = 0;

    //on reessaie de soummettre tous les signalements meme ceux en erreur
    for (var i=0; i<self.param.georems.length; i++) {
      delete self.param.georems[i].error;
    }

    function onError(e, msg) {
      nbErrors++;
      if (e.response && e.response.status === 401) {
        messageDlg ( msg, 
          "Connexion", {
            ok: "ok", 
            connect: "Se connecter..."
          },
          function(b) {
            if (b=="connect") self.connectDialog();
          }
        );
      }
      else{
        if (typeof(e.gremIndice) === 'undefined') return false;
        let grem = self.param.georems[e.gremIndice];
        grem.error = `Erreur: ${msg}`;
        postNext();
      }
    }

    function postNext() {
      var p = self.countLocalRems(false);
      // Ended ?
      if (!p) {
        if (typeof(options.onEnd)=='function') {
          options.onEnd();
        } else {
          waitDlg(false);
          if (nbErrors > 0) messageDlg(`${nbErrors} erreur(s) se sont produites lors de l'envoi des signalements.`);
          self.onUpdate();
        }
        return;
      }
      // Send next
      for (var i=0; i<self.param.georems.length; i++) {
        var grem = self.param.georems[i];
        if (!grem.id && !grem.error) {
          n++;
          self.postLocalRem (i, { 
            info: "Envoi des signalements ("+n+"/"+nb+")", 
            cback: postNext,
            error: onError,
            onPost: options.onPost
          });
          break;
        }
      }
    }
    // Start sending...
    if (nb) postNext();
    else messageDlg ("Tous les signalements ont déjà été envoyés..."," ");
  }

  // Selection d'un signalement
  wapp.report.on('select', (e) => {
    var f = wapp.report.getFeature(e.georem);
    wapp.select.getFeatures().clear();
    wapp.select.selectFeature(f, wapp.report.layer);
    wapp.showOnglet("info");
    wapp.showSelect({ report: !e.add });
  });
    
  // Affichage du dialogue 
  wapp.report.on('show', (e) => { 
    wapp.showPage('fiche', 'signal');
    var f = wapp.select.getFeatures().item(0);
    if (f && f.get('georem')) {
      f = false;
    }
    // unselect
    if (e.georem===false) f = false;
    wapp.select.getFeatures().clear();
    wapp.report.addFeature(f);
    var p = f ? ol_extent_getCenter(f.getGeometry().getExtent()) : wapp.map.getView().getCenter();
    p = ol_proj_transform(p, wapp.map.getView().getProjection(),'EPSG:4326');
    let wkt="POINT(" + p[0] + " " + p[1] + ")";
    $("input.geometry", e.form).val(wkt);
    // Pas d'objets a ajouter ?
    if (f || wapp.vector.length || wapp.getLayerGuichet().getLayers().getLength() || wapp.overlays.gps.getSource().getFeatures().length) {
      $(".addfeatures", wapp.report.formElement).show();
    } else {
      $(".addfeatures", wapp.report.formElement).hide();
    }
    // Ne plus selectionner
    wapp.select.setActive(false);
  });
  
  $("#signalements button").click(function(){ wapp.select.getFeatures().clear(); });
  if (wapp.report.param.profil) {
    wapp.getLogo(wapp.report.param.profil, function(logo) {
      $("#splash img").attr('src', logo || "");
    });
  }

  // Affichage de la page
  $("#fiche").on("showonglet hidepage", function() {
    wapp.report.cancelFormulaire('cancel');
  });
  wapp.report.on('cancel submit', () => {
    wapp.select.setActive(true);
  });
  $("#fiche").on("showonglet showpage", function() {
    // Selection ?
    const sel = wapp.select.getFeatures().item(0);
    if (sel && !sel.get('georem') && !sel.get('report')) {
      $('.sselect', wapp.report.formElement).show();
    } else {
      $('.sselect', wapp.report.formElement).hide();
    }
  });
  $("#fiche").on("showonglet", function() {
    wapp.showSelect();
  });
            
  // Set parameters
  wapp.paramInput.change();

  wapp.initGuichets();

  // Gerer la coherence
  $("#fiche").on('showpage', function() {
    var signalDiv = $(".signaler", this);
    if (wapp.userManager.param.communities && wapp.userManager.param.communities.length > 1) {
      $(".changeGroupe", signalDiv).show();
    } else {
      $(".changeGroupe", signalDiv).hide();
    }
    // Groupe public
    if (wapp.report.param.profil && wapp.report.param.profil.shared_georem=="all") {
      $(".warning_public", signalDiv).show();
    } else {
      $(".warning_public", signalDiv).hide();
    }
  });

  $('#signalements').on('showpage', () => {
    wapp.report.countLocalReps();
  });
}

export default initReport