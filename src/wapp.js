
import CordovApp from 'cordovapp/CordovApp'
import map from './map/map'
import { layerCache } from './map/map'
import {layers} from './map/map'
import setControls from './map/control'
import setInteractions from './map/interaction'
import initReport from './report/initReport'
import layerReport from './guichet/layerReport'
import getUserLayers from './guichet/userLayers'
import initOffline from './guichet/offline'

import ol_View from 'ol/View'

import ol_interaction_DragRotate from 'ol/interaction/DragRotate'
import ol_interaction_PinchRotate from 'ol/interaction/PinchRotate'
import {transformExtent as ol_proj_transformExtent} from 'ol/proj'

import ol_source_TileWMS from 'ol/source/TileWMS'
import ol_layer_Tile from 'ol/layer/Tile'

import ol_format_GPX from 'ol/format/GPX'

import CacheMap from 'cordovapp/ol/cache/CacheMap'
import CacheVector from 'cordovapp/ol/cache/CacheVector'
import ol_layer_CollabVector from 'cordovapp/ol/layer/CollabVector'

import config from './config';
import { wappStorage } from 'cordovapp/cordovapp/CordovApp'
import {unByKey} from 'ol/Observable'
import { Collection } from 'ol'
import Layer from 'ol/layer/Layer'
import * as fs from 'fs';


/** Web application pour l'acces a l'espace collaboratif depuis un mobile.
 * 
 * {@link CordovApp}
 * @namespace
 */
 var wapp = new CordovApp({
  /**
  * Initialize the application  
  * @memberof wapp
  */
  initialize: function() {
    // Affichage d'une patience avant lancement
    wapp.waitLogo ("Chargement...", false);
    setTimeout(function(){ wapp.initWapp(); }, 200);
    // Force GPS
    navigator.geolocation.getCurrentPosition((e)=>{});
  },
  
  initWapp: function() {
    /*
    // Splashscreen
    wapp.showPage('splash');
    setTimeout(function(){ wapp.hidePage('splash'); }, 2000);
    */
    /* Gestion du mode hors-connexion 
     * Rafraichir la carte quand on recupere la connexion
     * Pour les layers Wfs collaboratif switch mode en ligne/hors ligne
     */
    document.addEventListener("online", function(){
      wapp.refreshMap();
      wapp.switchLayersOnline(true);
    }, false);

    document.addEventListener("offline", function(){
      wapp.switchLayersOnline(false);
    }, false);

    // Version => cordova-plugin-app-version ???
    $(".version").text(config.version);
    // Gestion de l'aide en ligne
    $("#help").click(wapp.help.hide);

    // Afficher les operations ponctuelles (info COM)
    wapp.setOperations();

    // Gestion des parametres
    wapp.initParams();
    if (!wapp.param.visibleLayers) {
      wapp.param.visibleLayers = {
        'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2': true,
        'Croquis': true,
        'MesSignalements': true,
        'Signalements': true
      };
    }
    
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
      layerCache, {
        apiKey: config.apiKey,
        authentication: config.auth,
        loadPage: '#loadMap', 
        listMap: '#cartes [data-list="maps"] ul' 
      }
    );
    
    // Gestion du cache vecteur
    this.vectorCache = new CacheVector(wapp, {
      page: '#guichet',
      loadPage: '#loadGuichet'
    });

    //gestion apparence des boutons de Chargement/fermeture
    let mapMoveListener;
    let reinitloadGuichetBtn = () => {
      $('.cancel', '#loadGuichet').html('<i class="fa fa-close"></i>');
      $('.ok', '#loadGuichet').prop("disabled", false);
    }
    $('.cancel', '#loadGuichet').click(() => {
      reinitloadGuichetBtn();
    });

    $('.ok', '#loadGuichet').click(() => {
      $('.cancel', '#loadGuichet').html('Valider');
      $('.ok', '#loadGuichet').prop("disabled", true);
    });

    // Masquer les guichets lors du chargement du cache
    let visibleGuichet = true;
    $('#loadGuichet')
      .on('showpage', () => {
        visibleGuichet = wapp.getLayerGuichet().getVisible();
        wapp.getLayerGuichet().setVisible(false);
        wapp.saveContext();
        mapMoveListener = map.on('moveend', reinitloadGuichetBtn);
      })
      .on('hidepage', () => {
        wapp.getLayerGuichet().setVisible(visibleGuichet);
        wapp.saveContext();
        // Retour sur la page des guichets
        setTimeout(() => wapp.showPage('layer-guichet'));
        unByKey(mapMoveListener);
      });
    $('#loadMap')
      .on('showpage', function(){
        visibleGuichet = wapp.getLayerGuichet().getVisible();
        wapp.getLayerGuichet().setVisible(false);
        wapp.saveContext();
      })
      .on('hidepage', function(){
        wapp.getLayerGuichet().setVisible(visibleGuichet);
      });

    // Brancher les signalements
    initReport(wapp);
    layerReport(wapp);

    wapp.setDebugMode(); 

    // A propos 
    $('#apropos').on('showpage', function(){
      if (wapp.userManager.param.active_community) {
        var community = wapp.userManager.param.communities.find( function(g){
          return g.id === wapp.userManager.param.active_community;
        });
        if (community) {
          $("#apropos .groupe").show();
          $("#apropos .groupe h3 span").html('').text(community.name);
          $("#apropos .groupe div").html('').html(community.description);
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
        var tout = null;
        map.getLayerGroup().on('change', function() {
          if (wapp.layerReady) {
            if (tout) clearTimeout(tout);
            tout = setTimeout(() => {
              wapp.saveContext();
            });
          }
        });
        // Save position on move end (for iOS)
        map.on('moveend', function(){
          wapp.savePosition();
          // console.log('savePosition')
        });
      }, 500);
    }

    // Mode hors ligne
    const onlineSwitcher= $("[data-role='menu'] .offline");
    onlineSwitcher.on("click", function(){
      let online = !$(this).prop('checked');

      let message = false;
      if(online && navigator.connection.type == Connection.NONE) {
        message = "Aucune connexion active sur l'appareil."
      } else if(!online && !wapp.getCache(wapp.guichet).cache) {
        message = "Aucune donnée chargée en cache.";
      }

      if (message) {
        wapp.alert(message, 'Erreur', () => {$(this).prop('checked', online);});
      } else {
        wapp.switchLayersOnline(online);
      }
      wapp.toggleMenu();
    });

    initOffline(wapp);

    if (wapp.param.gpsSource === 'external') wapp.selectGPS();
    // Fin
//		wapp.wait(false);
  },

  /**
   * Switch mode en ligne / hors ligne
   * sur les couches wfs collaboratif
   * @param {bool} online 
   * @param {Collection<Layer>} layers
   * @param {boolean} silent pas d'affichage de la notification
   * @memberof wapp
   */
  switchLayersOnline: function(online, layers, silent = false) {
    if (!silent) {
      let onlinestr = online ? "désactivé": "activé";
      wapp.notification("Mode hors ligne " + onlinestr);
    }
    if (!layers) layers = wapp.map.getLayers();
    layers.forEach((l) => {
      if (l.getLayers) {
        wapp.switchLayersOnline(online, l.getLayers(), true);
      } else if (l instanceof ol_layer_CollabVector) {
        l.online(online);
      }
    });
    this.param.online = online;
    this.saveParam();      
    const onlineSwitcher= $("[data-role='menu'] .offline");
    onlineSwitcher.prop("checked", !online);
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
    if (this.getPage() === 'georemGPS') return;
    if (this.getPage() === 'conflicts') {
      $('#conflicts .object').removeClass('visible');
      return;
    }
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
    var noEdit = {};
    function saveVisibility(lays) {
      lays.forEach(function(l) {
        if (l.get('name')) {
          visible[l.get('name')] = ( l.getVisible() && l.get('displayInLayerSwitcher')!==false );
          if (visible[l.get('name')]) visible[l.get('name')] = l.getOpacity();
        }
        if (l.get('edit')===false) {
          noEdit[l.get('name')] = true;
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
    this.param.noEditLayers = noEdit;
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
//    this.refreshMap();
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
      var profil = wappStorage('report').profil;
      this.getLogo(profil, function(logo) {
        $("<img>").attr('src', logo || "")
          .prependTo(div);
      });
    } catch(e) { /* ok */ }
    this.wait (div, { className:'splash', anim: anim });
  }
};

/** Afficher une operation ponctuelle
 * ie. une notice promotionnel pour une operation specifique
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

/** Initialisation les parametres de l'application
*/
wapp.initParams = function() {
  if (!this.param.options) this.param.options = {};
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
      case 'mode': {
        $('body').attr('data-mode', options.mode);
        break;
      }
      case "searchbt": {
        if (e.val===false) $("#map .searchCtrl").hide();
        else $("#map .searchCtrl").show();
        break;
      }
      case "toleranceGPS": {
        val = Number(e.val) || 0;
        if (val<0) val = -val;
        if (inputs && val != options.toleranceGPS) {
          options.toleranceGPS = val;
          inputs.change();
        }
        if (wapp.interactions && wapp.interactions.geolocation) {
          wapp.interactions.geolocation.set('tolerance', val);
          wapp.interactions.reportGeolocation.set('tolerance', val);
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
        if (wapp.interactions && wapp.interactions.geolocation) {
          wapp.interactions.geolocation.set('minAccuracy', val);
        }
        break;
      }
      case "qlf": {
      /*
        if (wapp.report) {
         if (wapp.report.isService(e.val)) {
          wapp.report.setServiceUrl(e.val);
          wapp.report.deconnect();
          if (e.val) {
            console.warn('QUALIF:', e.val);
          }
         }
        }
      */
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

/** On a change de groupe 
*/
wapp.changeGroup = function (e) {
  // Supprimer la selection
  wapp.select.getFeatures().clear();
  wapp.onSelect();
  // Supprimer les layers des autres groupes
  var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'groupe' });
  var layersTab = [];
  // Recuperer les userLayers
  lgroup.getLayers().forEach((l) => {
    if (l.get('type')!=='CollabVector') {
      layersTab.push(l);
    }
  });
  // Ajouter les userLayers
  if (!layersTab.length) {
    layersTab = getUserLayers();
  }

  // Verifier les layers disponibles
  if (e.group) {
    var layers = e.group.layers;
    layers.forEach((l) => {
      if (l.geoservice && l.geoservice.type=="WMS") {
        var extent = l.geoservice.extent;
        extent = ol_proj_transformExtent(extent, "EPSG:4326", "EPSG:3857");
        var wmsParam = {
          title: l.geoservice.title,
          name: 'groupe_'+ l.geoservice.layers,
          visible: wapp.param.visibleLayers ? wapp.param.visibleLayers['groupe_'+ l.geoservice.layers] : true,
          description: l.description,
          query: !!l.getFeatureInfoMask,
          logo: e.group.logo_url,
          extent: extent[0] ? extent : undefined,
          minResolution: new ol_View({ zoom: l.geoservice.max_zoom }).getResolution(),
          maxResolution: new ol_View({ zoom: l.geoservice.min_zoom }).getResolution(),
          getFeatureInfoMask: l.getFeatureInfoMask,
          source: new ol_source_TileWMS({
            url: l.geoservice.url,
            projection: "EPSG:3857",
            // "crossOrigin": "anonymous",
            params: {
              "LAYERS": l.layer,
              "FORMAT": l.format,
              "VERSION": l.version
            },
            attributions: [e.group.name]
          })
        };
        const layer = new ol_layer_Tile (wmsParam);
        layer.set('type', 'CollabVector');
        layer.on('change:visible', () => {
          wapp.saveContext();
        });
        layersTab.push(layer);
      }
    });

    // Ajout des layers dans l'ordre
    lgroup.getLayers().clear();
    if (layersTab.length) {
      const keys = Object.keys(wapp.param.visibleLayers);
      layersTab.sort((a,b) => keys.indexOf(a.get('name')) - keys.indexOf(b.get('name')));
      layersTab.forEach((l) => { lgroup.getLayers().push(l); });
      // Titre
      lgroup.set('title', e.group.name);
      lgroup.setVisible(true);
    }
    // Afficher ?
    lgroup.set('displayInLayerSwitcher', !!(lgroup.getLayers().getLength()));
  }
};

/** Gestion des parametres caches et du mode debug
*/
wapp.setDebugMode = function() {
  var cheat = 0;
  var tcheat = new Date();
  $('#options [data-role="header"]').on("click touchstart", function(e) {
    e.stopPropagation();
    e.preventDefault();
    console.log('debug-mode', cheat)
    var t = new Date();
    if (t-tcheat > 250) cheat = 0;
    else cheat++;
    tcheat = t;
    if (cheat>10 || wapp.param.options.qlf) {
      wapp.notification ("Mode debug activé...",500);
      cheat=0;
      $(".debug").show();
      $("div.debug").css('display', 'inline-block');
    }
  });
  // Mode debug en qualif
  if (this.param.options.qlf) {
    $(".debug").show();
    $('#options .qlf').text(this.param.options.qlf.replace('https://qlf-collaboratif.ign.fr/', '').replace('/api/', ''));
  }
};

/** Passer en mode qualif */
wapp.setQualif = function() {
  if (!this.param.options.qlfList) this.param.options.qlfList = {};
  const choice = {
    '': 'Espace Co',
    'https://qlf-collaboratif.ign.fr/collaboratif-develop/api/' : 'Collaboratif-develop'
  }
  for (let i in this.param.options.qlfList) {
    choice[this.param.options.qlfList[i]] = i;
  }
  wapp.selectDialog(choice, 
    this.param.options.qlf, 
    (qlf) => { //@TODO et pour l url de prod (par defaut)??
      this.param.options.qlf = qlf;
      $('#options .qlf').text(this.param.options.qlf.replace('https://qlf-collaboratif.ign.fr/', '').replace('/api/', '') || 'Espace Co');
      wapp.report.userManager.setServiceUrl(qlf);
      let authParams = wapp.getAuthParameters(qlf);
      wapp.report.userManager.switchAuthParams(authParams.authBaseUrl, authParams.clientId, authParams.clientSecret);
      if (qlf) {
        console.warn('QUALIF:', qlf);
      }
    }, { 
      buttons: { cancel:'annuler', raz: 'RAZ', add:'Ajouter' }, 
      callback: (bt) => {
        // Ajouter un nouveau serveur
        if (bt==='add') {
          wapp.prompt(
            'Serveur de qualif.', 
            null, 
            (v) => {
              if (v) {
                var qlf = this.param.options.qlf = 'https://qlf-collaboratif.ign.fr/'+v+'/api/';
                this.param.options.qlfList[v] = 'https://qlf-collaboratif.ign.fr/'+v+'/api/';
                $('#options .qlf').text(v);
                wapp.report.userManager.setServiceUrl(qlf);
                let authParams = wapp.getAuthParameters(qlf);
                wapp.report.userManager.switchAuthParams(authParams.authBaseUrl, authParams.clientId, authParams.clientSecret);
              }
            }
          )
        } else if (bt==='raz') {
          console.log('raz')
          this.param.options.qlfList = {};
        }
      }
    }
  )
};

/**
 * Recuperation des parametres d environnement pour l interface de prod ou de qualif
 * selon l url d'api donnee
 * @param {String} url de base de l api collaborative
 * @returns {Object} {"authBaseUrl": "...", "clientId": "...", "clientSecret": "..."}
 */
wapp.getAuthParameters = function(url) {
  if ( url == wapp.param.options.qlf ) {
    return {
      "authBaseUrl": process.env.QLF_BASE_AUTH_URL,
      "clientId": process.env.QLF_COLLAB_API_CLIENT_ID,
      "clientSecret": process.env.QLF_COLLAB_API_CLIENT_SECRET
    };
  } else {
    return {
      "authBaseUrl": process.env.BASE_AUTH_URL,
      "clientId": process.env.COLLAB_API_CLIENT_ID,
      "clientSecret": process.env.COLLAB_API_CLIENT_SECRET
    };
  }
}


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
    var path = "SD/"+ (wapp.getPlatformId() === 'ios' ? "" : "GPX/");

    var write = function() {
      CordovApp.File.write (path + filename, gpx, function() {
        wapp.message("La fichier GPX/"+filename+" a bien été enregistré","GPX")
      }, function() {
        wapp.alert ("Impossible de créer le fichier");
      });
    }

    // Verifier la non existence du fichier
    CordovApp.File.listDirectory(path,
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

/**
 * Refresh the map to reload the tiles
 * @param {ol.Collection<ol.layer>} layers, default refresh all layers
 */
let time = 0;
wapp.refreshMap = function(layers) {
  // Refresh layers
  if (!layers) {
    // No more than one each 1s
    if ((new Date()).getTime()-time > 1000) {
      wapp.refreshMap(wapp.map.getLayers());
      time = (new Date()).getTime();
    }
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
        } else if (l===wapp.report.signalements && wapp.report.signalements.getSource()) {
          // Refresh signalements
          wapp.report.signalements.getSource().getSource().clear();
        } else if (l.getSource().reload) {
          // Reload CollabVector layer (when no cache)
          if (!l.get('cache')) {
            l.getSource().reload();
          }
        }
      }
      // Others
      else {
        // console.log("REFRESH", l);
      }
    });
  }
};

/**
 * clic sur le header permettant de changer de groupe actif
 * @returns void
 */
wapp.communityChoice =  function() {
  if (!wapp.userManager.param.user) return;
  wapp.userManager.communityChoice();
}

/** Recupere le logo d'un goupe
 * @param {any} g le groupe
 * @param {function} cback callback fonction qui renvoie le nom du fichier
 */
wapp.getLogo = function (g, cback, scope) {	
	CordovApp.File.getFile("TMP/logo/"+(g ? g.id : '_nologo_'), 
		function(fileEntry) { 
			cback.call(scope, CordovApp.File.getFileURI(fileEntry.toURL())); 
		}, 
		function() { 
			cback.call(scope, g ? g.logo_url : null); 
    }
  );
};

/* config is in wapp * /
 //Recherche fichier de config (config.json)
 wapp.noguichetConfig = undefined;
 wapp.changeGuichet = true;
 var path = 'src/config/config.json';
 try{
   var result = undefined;
   console.log("File ");

     result = fs.readFileSync(path,"utf8")
     var jsonData = undefined;
     if (result !="") {
       jsonData = JSON.parse(result);
      //  console.log(jsonData);
       if (jsonData  && jsonData.length > 0 && jsonData[0].noguichet !== undefined) {
        wapp.noguichetConfig = jsonData[0].noguichet;
         if (jsonData[0].changeGuichet === false) {
            wapp.changeGuichet = false;
            $('#changeGuichet').hide();
           
         }       
       }
     }
 } catch (e) {
    console.log('noconfig' + e);
 }

/** Connexion RIpart
*/
wapp.connect = function() {
  wapp.userManager.connectDialog({
    onConnect: function(user) {
      console.log('ok', user)
      if (user.username === "anonymous") {
        wapp.notification("Vous êtes déconnecté", 1200);
        if (wapp.noguichetConfig!== undefined) { $('p.userinfo').hide();}
      } else {
        if (wapp.noguichetConfig!== undefined) {
           if (wapp.noguichetConfig !==undefined) wapp.report.setProfil(wapp.noguichetConfig);
           if (wapp.changeGuichet === false) $('#changeGuichet').hide();
           $('p.userinfo').show();
        } 
        
        wapp.notification("Connecté au service", 1200);
        
      }
      wapp.initGuichets();
      wapp.report.signalements.getSource().getSource().clear();
      // Test visible layers
      var visible = 0;
      var layers = {};
      wapp.layers[0].getLayers().forEach((l) => {
        if (l.getVisible()) {
          visible += 1;
          console.log(l.get('layer'))
        }
        layers[l.get('layer')] = l;
      })
      wapp.layers[0].setVisible(true);
      if (!visible) {
        // Show on layer
        if (layers['GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2']) layers['GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'].setVisible(true);
        else if (layers['GEOGRAPHICALGRIDSYSTEMS.MAPS']) layers['GEOGRAPHICALGRIDSYSTEMS.MAPS'].setVisible(true);
        else if (layers['ORTHOIMAGERY.ORTHOPHOTOS']) layers['ORTHOIMAGERY.ORTHOPHOTOS'].setVisible(true);
        else {
          // Show first layer
          const k = Object.keys(layers);
          if (k.length) layers[k].setVisible(true);
        }
      }
		},
		onError: function(error) {
			var msg = [];
			wapp.initGuichets();
      let status = error.response ? error.response.status : 500;
			switch (status) {
        case 401: 
					msg = [ "Accès interdit" , "Utilisateur inconnu." ];
					break;
				case 400:
					msg = [ "Connexion", error.response.message ];
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




export default wapp
