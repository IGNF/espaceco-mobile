import RIPart from 'cordovapp/ripart/RipartForm'
import UserManagerTemplating from 'cordovapp/collaboratif/UserManagerTemplating'
import map from '../map/map'
import {ApiClient} from 'collaboratif-client-api';

import ol_layer_Vector from 'ol/layer/Vector'
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
function initRipart(wapp) {
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
    zIndex: Infinity
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
    wapp.ripart.countElement = $('.georemsCount span');
    switch (e.layer.get('name')) {
      case 'MesSignalements': {
        ol_ext_element.create('i', {
          className: 'fa fa-refresh',
          click: () => {
            wapp.ripart.updateLocalRems();
          },
          parent: div
        });
        var c = wapp.ripart.countLocalRems();
        ol_ext_element.create('i', {
          className: 'fa fa-send',
          html: '<div class="georemsCount tag"><span>'+c+'</span></div>',
          click: () => {
            wapp.ripart.postAllLocalRems();
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
            wapp.showDialog('dialog-info-ripart');
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

  // RIPart
  let apiClient = new ApiClient(url, authParams.authBaseUrl, authParams.clientId, authParams.clientSecret);
  wapp.userManager = new UserManagerTemplating(apiClient, {
    infoElement: '#options .connect span.connected' //[data-input-role="info"]
  })
  wapp.ripart = new RIPart(apiClient, {
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
            var currentFeatures = wapp.ripart.selectOverlay.getSource().getFeatures();
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
              georem.sketch = wapp.ripart.feature2sketch(currentFeatures, proj);
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
  wapp.ripart.postAllLocalRems = function(options) {
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
      if (e.status === 401) {
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

  $(() => {
    $(document).on("changegroup", function(e){ 
      wapp.changeGroup(e);
      wapp.ripart.setProfil(e.community);
    });
  });
  

  // Selection d'un signalement
  wapp.ripart.on('select', (e) => {
    var f = wapp.ripart.getFeature(e.georem);
    wapp.select.getFeatures().clear();
    wapp.select.selectFeature(f, wapp.ripart.layer);
    wapp.showOnglet("info");
    wapp.showSelect({ ripart: !e.add });
  });
    
  // Affichage du dialogue 
  wapp.ripart.on('show', (e) => { 
    wapp.showPage('fiche', 'signal');
    var f = wapp.select.getFeatures().item(0);
    if (f && f.get('georem')) {
      f = false;
    }
    // unselect
    if (e.georem===false) f = false;
    wapp.select.getFeatures().clear();
    wapp.ripart.addFeature(f);
    var p = f ? ol_extent_getCenter(f.getGeometry().getExtent()) : wapp.map.getView().getCenter();
    p = ol_proj_transform(p, wapp.map.getView().getProjection(),'EPSG:4326');
    $("input.lon", e.form).val(p[0].toFixed(8));
    $("input.lat", e.form).val(p[1].toFixed(8));
    // Pas d'objets a ajouter ?
    if (f || wapp.vector.length || wapp.getLayerGuichet().getLayers().getLength() || wapp.overlays.gps.getSource().getFeatures().length) {
      $(".addfeatures", wapp.ripart.formElement).show();
    } else {
      $(".addfeatures", wapp.ripart.formElement).hide();
    }
    // Ne plus selectionner
    wapp.select.setActive(false);
  });

  // Patience
  wapp.waitLogo ("Connexion...");
  
  $("#signalements button").click(function(){ wapp.select.getFeatures().clear(); });
  if (wapp.ripart.param.profil) {
    wapp.getLogo(wapp.ripart.param.profil, function(logo) {
      $("#splash img").attr('src', logo || "");
    });
  }

  // Affichage de la page
  $("#fiche").on("showonglet hidepage", function() {
    wapp.ripart.cancelFormulaire('cancel');
  });
  wapp.ripart.on('cancel submit', () => {
    wapp.select.setActive(true);
  });
  $("#fiche").on("showonglet showpage", function() {
    // Selection ?
    const sel = wapp.select.getFeatures().item(0);
    if (sel && !sel.get('georem') && !sel.get('ripart')) {
      $('.sselect', wapp.ripart.formElement).show();
    } else {
      $('.sselect', wapp.ripart.formElement).hide();
    }
  });
  $("#fiche").on("showonglet", function() {
    wapp.showSelect();
  });
            
  // Set parameters
  wapp.paramInput.change();

  // Actualiser le compte
  var timer = new Date();
  wapp.userManager.checkUserInfo(
    function () {
      timer = (new Date())-timer;
      setTimeout (function () { wapp.wait(false); }, Math.max(0, 2000 - timer));
      wapp.notification("Connecté au service",1200);
      wapp.initGuichets();
    }, 
    function() {
      timer = (new Date())-timer;
      wapp.waitLogo("Chargement...");
      setTimeout (function () { wapp.wait(false); }, Math.max(0, 2000 - timer)); 
      wapp.initGuichets();
    }
  );

  // Gerer la coherence
  $("#fiche").on('showpage', function() {
    var signalDiv = $(".signaler", this);
    if (wapp.userManager.param.communities && wapp.userManager.param.communities.length > 1) {
      $(".changeGroupe", signalDiv).show();
    } else {
      $(".changeGroupe", signalDiv).hide();
    }
    // Groupe public
    if (wapp.ripart.param.profil && wapp.ripart.param.profil.shared_georem=="all") {
      $(".warning_public", signalDiv).show();
    } else {
      $(".warning_public", signalDiv).hide();
    }
  });

  $('#signalements').on('showpage', () => {
    wapp.ripart.countLocalReps();
  });
}

export default initRipart