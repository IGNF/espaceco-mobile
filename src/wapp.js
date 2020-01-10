import CordovApp from 'cordovapp/Cordovapp'
import CordovAppFile from 'cordovapp/cordovapp/File'
import map from './map/map'
import {layers} from './map/map'
import setControls from './map/control'
import setInteractions from './map/interaction'

import ol_View from 'ol/View'

import ol_layer_Vector from 'ol/layer/Vector'
import ol_source_Vector from 'ol/source/Vector'
import ol_interaction_DragRotate from 'ol/interaction/DragRotate'
import ol_interaction_PinchRotate from 'ol/interaction/PinchRotate'
import {transform as ol_proj_transform} from 'ol/proj'
import {transformExtent as ol_proj_transformExtent} from 'ol/proj'
import {fromLonLat as ol_proj_fromLonLat} from 'ol/proj'
import {getCenter as ol_extent_getCenter} from 'ol/extent'
import {boundingExtent as ol_extent_boundingExtent} from 'ol/extent'
import {buffer as ol_extent_buffer} from 'ol/extent'

import ol_source_TileWMS from 'ol/source/TileWMS'
import ol_layer_Tile from 'ol/layer/Tile'

import ol_format_GPX from 'ol/format/GPX'

import CacheMap from 'cordovapp/ol/cache/CacheMap'
import CacheVector from 'cordovapp/ol/cache/CacheVector'
import RIPart from 'cordovapp/ripart/RipartForm'
import ol_source_RIPart from 'cordovapp/ol/source/RIPart'
import {georemStyle} from 'cordovapp/ol/source/RIPart'

import ol_layer_AnimatedCluster from 'ol-ext/layer/AnimatedCluster'
import ol_source_Cluster from 'ol/source/Cluster'

import getCacheFileName from 'cordovapp/cordovapp/File'

import config from './config';
import { wappStorage } from 'cordovapp/cordovapp/CordovApp'

/** Web application pour l'acces a l'espace collaboratif depuis un mobile.
 * 
 * {@link CordovApp}
 * @namespace
 */
 var wapp = new CordovApp({
  /**
  * Initilize the application  
  * @memberof wapp
  */
  initialize: function() {
    // Affichage d'une patience avant lancement
    wapp.waitLogo ("Chargement...", false);
    setTimeout(function(){ wapp.initWapp(); }, 200);
  },
  
  initWapp: function() {
    /*
    // Splashscreen
    wapp.showPage('splash');
    setTimeout(function(){ wapp.hidePage('splash'); }, 2000);
    */
    // Gestion du mode hors-connexion 
    document.addEventListener("online", function(){
      wapp.online();
    }, false);

    // Version => cordova-plugin-app-version ???
    $(".version").text(config.version);
    // Gestion de l'aide en ligne
    $("#help").click(wapp.help.hide);

    // Afficher les operations ponctuelles
    wapp.setOperations();

    // Gestion des parametres
    wapp.initParams();

    // Layers de l'application
    wapp.initMap();
    // Affichage des layers
    wapp.showLayers();

    // Initialise les controls de la carte
    setControls(wapp);

    // Ajout des interactions sur la carte
    setInteractions(wapp);

    wapp.wait(false);

    // Gestion du cache
    this.cache = new CacheMap(
      wapp, 
      wapp.map.getLayers().getArray().find((l)=> {
        return l.get('name')==='cache';
      }), {
        apiKey: config.apiKey,
        authentication: config.auth,
        loadPage: "#loadMap", 
        listMap: '#cartes [data-list="maps"] ul' 
      }
    );
    
    // Gestion du cache vecteur
    this.vectorCache = new CacheVector(wapp, {
      page: "#guichet",
      loadPage: "#loadGuichet" 
    });

    // Brancher les signalements
    wapp.initRipart();
    wapp.layerRipart();

    wapp.setDebugMode();

    // A propos
    $('#apropos').on('showpage', function(){
      if (wapp.ripart.param.profil) {
        var groupe = wapp.ripart.param.groupes.find( function(g){
          return g.id_groupe === wapp.ripart.param.profil.id_groupe;
        });
        if (groupe) {
          $("#apropos .groupe").show();
          $("#apropos .groupe h3 span").html('').text(groupe.nom);
          $("#apropos .groupe div").html('').html(groupe.desc);
        } else {
          $("#apropos .groupe").hide();
        }
      } else {
        $("#apropos .groupe").hide();
      }
    });

    // On iOS save information on moveend
    if (wapp.getPlatformId() === 'ios') {
      // Save layers information
      setTimeout(function() {
        map.getLayerGroup().on('change', function() {
          wapp.saveContext();
          console.log('saveContext')
        });
        // Save position on move end (for iOS)
        map.on('moveend', function(){
          wapp.savePosition();
          console.log('savePosition')
        });
      }, 500);
    }

    // Fin
//		wapp.wait(false);
  },

  /** Enable map rotation
   * @param {boo} b true to enable rotation
   * @memberof wapp
   */
  rotateMap: function(b){
    if (!this.map) return;
    var inter = this.map.getInteractions().getArray().filter(function(interaction) {
      return interaction instanceof ol_interaction_PinchRotate
        || interaction instanceof ol_interaction_DragRotate;
    });
    for (var i=0; i<inter.length; i++) inter[i].setActive(b);
  },
  
  /** Show/hide menu
  * @memberof wapp
  */
  onMenu: function() {
    this.hidePage();
  },

  /** Fires when the user presses the back button
  * @memberof wapp
  */
  onBackButton: function() {
    // Ne pas sortir si en cours de traitement
    if (this.isWaiting()) return;
    // Fermer avant de sortir
    if (this.isFullscreen()) this.hideFullscreen();
    else if (this.getPage()) this.hidePage();
    else if (this.isMenu()) this.hideMenu();
    else CordovApp.prototype.onBackButton.apply(this); 
  },

  /** Fires when the user presses the menu button
  * @memberof wapp
  * @api
  */
  onMenuButton: function() { if (!this.isWaiting()) this.toggleMenu(); },

  /** Save current position
   */
  savePosition: function() {
    var pos = this.map.getView().getCenter();
    var zoom = this.map.getView().getZoom();
    var position = this.param['position'] = { 
      lon: Math.round(pos[0]*100)/100, 
      lat: Math.round(pos[1]*100)/100, 
      zoom:zoom 
    };
    wappStorage('position', position);
  },

  /** Get the saved position
   * @return {ol.coordinate|null} the saved position or null if none
   */
  getPosition: function() {
    return wappStorage('position') || null;
  },

  /** Save current position 
  * @memberof wapp
  */
  saveContext: function() {
    this.savePosition();
    var visible = {};
    function saveVisibility(lays) {
      lays.forEach(function(l) {
        if (l.get('name')) {
          visible[l.get('name')] = l.getVisible();
        }
        if (l.getLayers) saveVisibility(l.getLayers());
      });
    }
    saveVisibility(wapp.map.getLayers());
    // Old_Struct
    delete this.param.layers;
    delete this.param.hidden;
    // end Old_Struct
    this.param.visibleLayers = visible;
    this.saveParam();
  },

  /** Sauvegarde du contexte avant de quitter
  * @memberof wapp
  */
  quit: function() {
    this.saveContext();
    CordovApp.prototype.quit.apply(this);
  },

  /** Save context on pause
  * @memberof wapp
  */
  pause: function() {
    this.saveContext();
  },

  /** On resume refresh the map 
  * @memberof wapp
  */
  resume: function() {
    this.refreshMap();
  }

});

/** Message d'attente avec affichage du logo du groupe
 */
wapp.waitLogo = function(info, anim) {
  if (this.isWaiting() && $("#wait").hasClass('splash')) {
    $("#wait p").text(info);
  } else {
    var div = $("<div>").append($("<p>").text(info));
    try {
      var profil = wappStorage('ripart').profil;
      this.getLogo(profil, function(logo) {
        $("<img>").attr('src', logo || "")
          .prependTo(div);
      });
    } catch(e) { /* ok */ }
    this.wait (div, { className:'splash', anim: anim });
  }
};

/** Afficher une operation ponctuelle
*/
wapp.setOperations = function() {
  var currentOperations = {};
  if (!wapp.param.operations) wapp.param.operations = {};
  $(".operation[data-date]").each(function() {
    var ope = $(this);
    if ((new Date()) < new Date(ope.data('date'))) {
      ope.show();
      var name = ope.data('name') || "none";
      var icon = ope.data('icon') || 'star-o';
      var className = ope.data('class')||"";
      var freq = Number(ope.data('frequence')||0.15);
      if (!wapp.param.operations[name] || Math.random()<freq) {
        wapp.notinfo (
          $(".title",ope).html(), 
          $(".msg", ope).html(), {
            icon: "<i class='fa fa-"+icon+"'></i>", 
            className: className 
          }
        );
      }
      currentOperations[name] = true;
    } else {
      ope.hide();
    }
  });
  wapp.param.operations = currentOperations;
};

/** Initialisation des parametres de l'application
*/
wapp.initParams = function() {
  if (!this.param.options) this.param.options={};
  var options = this.param.options;
  // On change
  var val;
  var inputs = this.paramInput = this.setParamInput("#options", options, function(e) {
    switch (e.name) {
      case "rotmap": {
        wapp.rotateMap(e.val);
        break;
      }
      case "zoombt": {
        if (e.val===false) $("#map .ol-zoom").hide();
        else $("#map .ol-zoom").show();
        break;
      }
      case 'extended': {
        $('body').attr('data-mode', options.extended?'extended':null);
        break;
      }
      case "searchbt": {
        if (e.val===false) $("#map .searchCtrl").hide();
        else $("#map .searchCtrl").show();
        break;
      }
      case "toleranceGPS": {
        val = Number(e.val) || 100;
        if (val<0) val = -val;
        if (inputs && val != options.toleranceGPS) {
          options.toleranceGPS = val;
          inputs.change();
        }
        if (wapp.interactions) {
          wapp.interactions.geolocation.set('tolerance', val);
        }
        break;
      }
      case "minGPSAccuracy": {
        val = Number(e.val) || 100;
        if (val<0) val = -val;
        if (inputs && val != options.minGPSAccuracy) {
          options.minGPSAccuracy = val;
          inputs.change();
        }
        if (wapp.interactions) {
          wapp.interactions.geolocation.set('minAccuracy', val);
        }
        break;
      }
      case "qlf": {
        if (wapp.ripart) {
          var qlf = /qlf/.test(wapp.ripart.getServiceUrl());
          if (e.val != qlf) {
            if (e.val) {
              //wapp.ripart.setServiceUrl("https://qlf-collaboratif.ign.fr/collaboratif-develop/api/");
              wapp.ripart.setServiceUrl("https://qlf-collaboratif.ign.fr/collaboratif-2.3/api/");
            } else {
              wapp.ripart.setServiceUrl("https://espacecollaboratif.ign.fr/api/");
            }
            wapp.ripart.deconnect();
          }
        }
        break;
      }
      default: break;
    }
  });
};

/** Initialise la carte
*/
wapp.initMap = function() {
  this.map = map;
  this.layers = layers;
  var pos = this.getPosition() || this.param.position || {};
  if (pos.lon || pos.lat) map.getView().setCenter([pos.lon, pos.lat]);
  map.getView().setZoom(Math.min(18, pos.zoom || 5));
  map.setTarget('map');
};

/** Initialisation des signalements
*/
wapp.initRipart = function() {
  var self = this;

  // RIPart
  this.ripart = new RIPart({
    url: this.param.options.qlf ? "https://qlf-collaboratif.ign.fr/collaboratif-develop/api/" : null,
    map: map,
    infoElement: '#options .connect [data-input-role="info"] span.connected',
    countElement: '.georemsCount span',
    listElement: '#signalements [data-role="content"]',
    formElement: '#fiche .signaler',
    layer: new ol_layer_Vector({
      source: new ol_source_Vector(),
      name: "Mes signalements"
    }),
    // Formatage du signalement / verification avant envoie
    formatGeorem: function(georem /*, form */) {
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
      // Forcer le groupe
      // georem.id_groupe = this.param.groupes[0].id_groupe;
      // Protocol
      georem.protocol = "_MONGUICHET_65876";
      georem.version = "0.1";
      return true;
    },
    /*
    // Localisation via GPS
    onLocate : function(loc)
    {	$("span.lon", this.formElement).text(loc.position[0].toFixed(7));
      $("span.lat", this.formElement).text(loc.position[1].toFixed(7));
      $("span.accuracy", this.formElement).text(loc.accuracy);
    }
    */
  });

  wapp.ripart.on("changegroup", function(e){ wapp.changeGroup(e); });

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
    wapp.select.getFeatures().clear();
    wapp.ripart.addFeature(f);
    var p = f ? ol_extent_getCenter(f.getGeometry().getExtent()) : wapp.map.getView().getCenter();
    p = ol_proj_transform(p, wapp.map.getView().getProjection(),'EPSG:4326');
    $("input.lon", e.form).val(p[0].toFixed(8));
    $("input.lat", e.form).val(p[1].toFixed(8));
    // Pas d'objets a ajouter ?
    if (f || wapp.vector.length || wapp.overlays.gps.getSource().getFeatures().length) {
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
    self.ripart.cancelFormulaire();
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
  this.paramInput.change();

  // Actualiser le compte
  var timer = new Date();
  this.ripart.checkUserInfo(
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
    if (wapp.ripart.param.groupes && wapp.ripart.param.groupes.length > 1) {
      $(".changeGroupe", signalDiv).show();
    } else {
      $(".changeGroupe", signalDiv).hide();
    }
    // Groupe public
    if (wapp.ripart.param.profil && wapp.ripart.param.profil.status!="prive") {
      $(".warning_public", signalDiv).show();
    } else {
      $(".warning_public", signalDiv).hide();
    }
  });
};

/** Calque des signalements 
 * 
 */
wapp.layerRipart = function () {
  const dir = 'FILE/cache-signalements/';
  const cache = {
    saveCache: function(response, tileCoord) {
      var fileName = dir+tileCoord.join('-');
      CordovAppFile.getDirectory(dir, 
        function() {
          getCacheFileName.write(
            fileName, 
            response
            // options.success,
            // options.error
          );
        }, 
        function(){},
        true
      );
    },
    loadCache: function(options) {
      var fileName = dir + options.tileCoord.join('-');
      CordovAppFile.read(
        fileName, 
        options.success,
        options.error
      );
    }
  };

  // Calque des signalements
  var signalements = new ol_layer_AnimatedCluster({
    title: 'Signalements',
    name: 'Signalements',
    maxResolution: 600, // zoom 6
    source: new ol_source_Cluster({
      source: new ol_source_RIPart({
        ripart: this.ripart
      }, cache),
      attributions: 'IGN'
    })
  });
  map.addLayer(signalements);
  wapp.testHiddenLayer(signalements);

  signalements.setStyle(georemStyle);
  wapp.ripart.signalements = signalements;
};

/** On a change de groupe 
*/
wapp.changeGroup = function (e) {
  // Supprimer la selection
  wapp.select.getFeatures().clear();
  wapp.onSelect();
  // Supprimer les layers des autres groupes
  var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
  lgroup.getLayers().clear();
  // Verifier les layers disponibles
  if (e.group) {
    var layers = e.group.layers;
    for (var i=0, l; l = layers[i]; i++) {
      if (l.type=="WMS") {
        var extent = l.extent;
        extent = ol_proj_transformExtent(extent, "EPSG:4326", "EPSG:3857");
        var wmsParam = {
          "title": l.nom,
          "logo": e.group.logo,
          "extent": extent[0] ? extent : undefined,
          "minResolution": new ol_View({ zoom: l.maxzoom }).getResolution(),
          "maxResolution": new ol_View({ zoom: l.minzoom }).getResolution(),
          "getFeatureInfoMask": l.getFeatureInfoMask,
          "source": new ol_source_TileWMS({
            "url": l.url,
            "projection": "EPSG:3857",
            // "crossOrigin": "anonymous",
            "params": {
              "LAYERS": l.layer,
              "FORMAT": l.format,
              "VERSION": l.version
            },
            "attributions": [e.group.nom]
          })
        };
        lgroup.getLayers().push( new ol_layer_Tile (wmsParam) );
      }
    }
    lgroup.set('title', e.group.nom);
  }
  // Afficher ?
  lgroup.set("displayInLayerSwitcher", !!(lgroup.getLayers().getLength()));
};

/** Gestion des parametres caches et du mode debug
*/
wapp.setDebugMode = function()
{	var cheat = 0;
  var tcheat = new Date();
  $('#options [data-role="header"]').on("click touchstart", function(e)
  {	e.stopPropagation();
    e.preventDefault();
    console.log('debug-mode', cheat)
    var t = new Date();
    if (t-tcheat > 250) cheat = 0;
    else cheat++;
    tcheat = t;
    if (cheat>10 || wapp.param.options.qlf)
    {	wapp.notification ("Mode debug activé...",500);
      cheat=0;
      $(".debug").show();
      $("div.debug").css('display', 'inline-block');
    }
  });
  // Mode debug en qualif
  if (this.param.options.qlf) {
    $(".debug").show();
  }
};

/** Affichage des layers
 */
wapp.showLayers = function(layers) {
  if (!layers) layers = this.map.getLayers().getArray();
  layers.forEach((l) => {
    wapp.testHiddenLayer(l);
  });
};

/** Sauvegarder une trace GPS (selectionnee)
 */
wapp.saveGPS = function() {
  var f = wapp.select.getFeatures().item(0);
  if (f.getGeometry().getType()=="LineString") {
    var format = new ol_format_GPX();
    var gpx = '<?xml version="1.0"?>'+format.writeFeatures([f], {
      featureProjection:wapp.map.getView().getProjection()
    });
    
    // Nom sur la date d'aujourd'hui
    var d = new Date();
    d = d.getFullYear()
      +"-"+ ("00" + (d.getMonth() + 1)).slice(-2)
      +"-"+ ("00" + d.getDate()).slice(-2);
    var filename = d+".gpx";

    var write = function() {
      var path = "SD/"+ (wapp.getPlatformId() === 'ios' ? "" : "GPX/");
      CordovApp.File.write (path + filename, gpx, function() {
        wapp.message("La fichier GPX/"+filename+" a bien été enregistré","GPX")
      }, function() {
        wapp.alert ("Impossible de créer le fichier");
      });
    }

    // Verifier la non existence du fichier
    CordovApp.File.listDirectory("SD/GPX",
      function(files) {
        var nb = 0;
        /* eslint-disable-next-line no-constant-condition */
        while (true) {
          for (var i=0; i<files.length; i++) {
            if (files[i].name===filename) {
              nb++;
              break;
            }
          }
          // incrmenter ?
          if (i==files.length) break;
          else filename = d+"-"+nb+".gpx";
        }
        write();
      }, write );
  }
};

/** Gestion du mode hors-connexion 
 * Rafraichir la carte quand on recupere la connexion
 */
wapp.online = function() {
  // console.log('ONLINE');
  wapp.refreshMap();
};

/**
 * Refresh the map to reload the tiles
 * @param {ol.Collection<ol.layer>} layers, default refresh all layers
 */
wapp.refreshMap = function(layers) {
  // Refresh layers
  if (!layers) {
    wapp.refreshMap(wapp.map.getLayers());
    return;
  } else {
    layers.forEach(function(l) {
      // Group
      if (l.getLayers) {
        wapp.refreshMap(l.getLayers());
      } else if (l.getSource && l.getSource()) {
        // Geoportail layer
        if (l.getSource().setTileLoadFunction) {
          // console.log(l.get('name'), l);
          l.getSource().setTileLoadFunction(l.getSource().getTileLoadFunction())
        } else if (l.getSource().reload) {
          // Reload Webpart layer (when no cache)
          if (!l.get('cache')) l.getSource().reload();
        }
      }
      // Others
      else {
        // console.log("REFRESH", l);
      }
    });
  }
  // Refresh signalements
  if (wapp.ripart.signalements.getSource()) {
    wapp.ripart.signalements.getSource().getSource().clear();
  }
};

/** Recupere le logo d'un goupe
 * @param {any} g le groupe
 * @param {function} cback callback fonction qui renvoie le nom du fichier
 */
wapp.getLogo = function (g, cback, scope) {	
	CordovApp.File.getFile("TMP/logo/"+(g ? g.id_groupe : '_nologo_'), 
		function(fileEntry) { 
			cback.call(scope, fileEntry.toURL()); 
		}, 
		function() { 
			cback.call(scope, g ? g.logo : null); 
		});
};

/** Connexion RIpart
*/
wapp.connect = function() {
  wapp.ripart.connectDialog({
    onConnect: function() {
			wapp.notification("Connecté au service",1200);
      wapp.initGuichets();
      wapp.ripart.signalements.getSource().getSource().clear();
		},
		onError: function(error) {
			var msg = [];
			wapp.initGuichets();
		
			switch (error.status) {
        case 401: 
					msg = [ "Accès interdit" , "Utilisateur inconnu." ];
					break;
				case "no_profile":
					msg = [ "Connexion", error.statusText ]
					break;
				default: 
					msg = [ "Connexion", "Connexion impossible...<br/>Vérifiez votre connexion." ];
					console.log(error)
					break;
			}
			wapp.message (msg[1], msg[0], 
				{ ok:"ok" },
				function() {
          wapp.connect();
				});
		}
	});
};

/** Select external GPS
 */
wapp.selectGPS = function() {
  navigator.geolocation.showSourcePicker('Sélectionner la source');
};
  
export default wapp
