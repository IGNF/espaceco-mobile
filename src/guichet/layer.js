import wapp from '../wapp'
import CordovApp from 'cordovapp/CordovApp'
import CordovAppFile from 'cordovapp/cordovapp/File'

import {all as ol_loadingstrategy_all} from 'ol/loadingstrategy'
import ol_layer_Vector_WFS from 'cordovapp/ol/layer/WFS'
import {boundingExtent as ol_extent_boundingExtent} from 'ol/extent'
import {buffer as ol_extent_buffer} from 'ol/extent'
import {transformExtent as ol_proj_transformExtent} from 'ol/proj'

import ol_layer_Vector_CollabVector from 'cordovapp/ol/layer/CollabVector'

/**
 * Creer un layer WFS externe
 * @param {} groupe
 * @param {} l layer options
 */
wapp.layerWFS = function(groupe, l) {
  var vector;

  // Methode de chargement
  if (l.geoservice.input_mask && l.geoservice.input_mask.loadStrategy==='all') {
    l.strategy = new ol_loadingstrategy_all();
    l.once = true;			// Chargement en une fois
  }
  //
  l.authentication = function(layer, cback) {
    var content = CordovApp.template("dialog-authenticate");
    $('span', content).text(layer.get('name'));
    wapp.dialog.show (content, {
      title: "Connexion", 
      buttons: { submit:"OK", cancel:"Annuler" },
      callback: function(b) {
        if (b=='submit') {
          cback($('.nom', content).val(), $('.pwd', content).val());
        }
        else {
          cback(false);
        }
      }
    });
  };

  // Gestion du cache
  var cache = {};
  if (l.once) {
    cache = {
      saveCache: function(response, extent, resolution) {
        var fileName = 'FILE/cache/'+this.getCacheFileName(extent, resolution); 
        CordovAppFile.getDirectory('FILE/cache', 
          function() {
            CordovAppFile.write(
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
        if (wapp.param.options.nocache) {
          options.error('nocache');
          console.log("NOCACHE");
          return;
        }
        var fileName = 'FILE/cache/'+this.getCacheFileName(options.extent, options.resolution);
        CordovAppFile.info(
          fileName, 
          function(file){
            /* Obsolete (plus d'un jour)
            if ((new Date() - file.lastModified) > 24*3600*1000 ) {
            */
            // Obsolete (plus de 5 min)
            if (!options.obsolete && (new Date() - file.lastModified) > 5*60*1000 ) {
              options.error('obsolete');
            } else {
              // Lire le cache
              CordovAppFile.read(
                fileName, 
                options.success,
                options.error
              );
            }
          },
          function() {
            options.error('nocache');
          }
        );
      }
    };
  }
  // Layer a charger
  vector = new ol_layer_Vector_WFS (l, cache);
  
  // Menage
  delete l.strategy;
  delete l.authentication;

  //
  vector.set('logo', groupe.logo_url);
  if (l.geoservice.input_mask) vector.set('attach', l.geoservice.input_mask.joinData);
  
  // Chargement OK
  vector.once('ready', function() {
      // Sauvegarde login / pwd
      wapp.report.saveParam();
      // Recherche sur la couche ?
      wapp.setSearchSource(this.getSource(), this.get('search'));
      // Load source at center if once
      if (this.getSource().get('once')) {
        this.getSource().loaderFn_(
          ol_extent_boundingExtent([wapp.map.getView().getCenter()]), 
          1, 
          wapp.map.getView().getProjection()
        );
      }
  }, vector);
  // Probleme au chargement
  vector.on("error", function(){});

  return vector;
};

/**
 * Creer un layer CollabVector
 * @param {} l layer options
 * @param {string} cacheUrl
 */
wapp.layerCollabVector = function(l, cacheUrl) {
  var vector;
  var url = l.table.wfs.replace(/(.*)\?(.*)/,"$1");
  var extent = [];

  for (var k=0; k<l.extent.length; k++) extent[k] = parseFloat(l.extent[k]);
  extent = ol_proj_transformExtent(extent, 'EPSG:4326', wapp.map.getView().getProjection());
  let snapTo = l.snapto;
  if (snapTo) {
    snapTo = snapTo.split(',');
    snapTo.forEach((s, i) => {
      snapTo[i] = parseInt(s);
    })
  }
  vector = new ol_layer_Vector_CollabVector({
    url: url,
    //renderMode: 'image',
    name: l.table.name,
    title: l.table.title,
    cacheUrl: cacheUrl,
    table: l.table,
    database: l.table.database,
    extent: extent,
    client: wapp.userManager.apiClient,
    snapTo: snapTo,
    role: l.role,
    visible: l.visibility,
    opacity: l.opacity,
    options: l,
    // style: guichet.style,
    maxResolution: 40, // zoom 13
    checkSourceOptions: function (options, table) {
      // Limiter la taille des tuilles en fonction du minZoom
      options.tileZoom = table.tile_zoom_level; //|| Math.max(featureType.minZoomLevel-2, 4);
      // Update tile zoom
      l.tilezoom = table.tile_zoom_level;
    }.bind(this)
  },{
    preserved: this.select.getFeatures(),
    filter: (l.table.database=="bduni_metropole" ? {detruit:false} : {}),
    outputFormat: l.format,
    // Tile zoom to calculate tiles
    tileZoom: 13,
    maxFeatures: 5000,
    maxReload: wapp.param.options.maxReload || 10000,
    online: (wapp.param.online != undefined) ? wapp.param.online : true
  });

  return vector;
};

/** Test and hide hidden layers
 */
wapp.testHiddenLayer = function(layer) {
  // First time use default
  if (!this.param.visibleLayers) return;
  // Test
  if (layer.getLayers) {
    layer.getLayers().forEach(function(l){
      wapp.testHiddenLayer(l);
    });
  }
  if (this.param.noEditLayers && this.param.noEditLayers[layer.get('name')]) {
    layer.set('edit', false);
  }
  
  if (layer.get('title') === 'extent') {
    layer.setVisible(true);
  } else if (!(layer.get('name') in this.param.visibleLayers)) {
    return; // si pas de cache on garde les parametres de la layer a la construction
  } else {
    if (layer.get('displayInLayerSwitcher') !== false 
    && this.param.visibleLayers[layer.get('name')] !== false) {
      layer.setVisible(true);
      layer.setOpacity(this.param.visibleLayers[layer.get('name')] || 1);
    } else {
      layer.setVisible(false);
    }
  }
};

/** Recherche des layers du guichet courant
 */
wapp.getLayerGuichet = function(pos) {
  const l = this.map.getLayers().getArray().find((l) => l.get('name') ==='guichet');
  if (pos) return l[pos];
  else return l;
};

/** Chargement des layers d'un guichet
 * @param {} groupe
 */
wapp.loadLayers = function (groupe) {
  // Layer du guichet
  var guichet = wapp.getLayerGuichet();
  var i;

  // Layers du guichet
	this.vector = [];
	guichet.getLayers().clear();
	if (!groupe.layers) {
    guichet.set("displayInLayerSwitcher", false);
		return;
	}
  guichet.set("displayInLayerSwitcher", true);
  guichet.set("title", 'Guichet: '+groupe.name);

  // Layers en cache
  var layers = [];
  var groupLayers = [];
  var cacheLayers = [];
  var cache = wapp.vectorCache.getLayers(groupe, cacheLayers);
  if (cache.length) {
    console.log('CACHE')
    layers = cache[0].getLayers().getArray();
    // Recherche des layers en ligne (pas dans le cache)
    groupe.layers.forEach((l) => {
      var found = false;
      for (let i=0, c; c=cacheLayers[i]; i++) {
        if (l.table && c.table.name === l.table.name && c.table.uri === l.table.uri) {
          found = true;
          break;
        }
      }
      if (!found) groupLayers.push(l);
    });
  } else {
    groupLayers = groupe.layers
  }
  // Chargement des guichets en ligne
  var nb=0, nbLoad=0;
  var loading = {};

  // Ajouter les layers du guichet
  var l;
  for (i=0; l=groupLayers[i]; i++) {
    if (
      (l.geoservice && l.geoservice.type == "WFS")
      || l.table
    ) {
      nb++;
      var vector;
      // WFS externe
      if (l.geoservice && l.geoservice.type == "WFS") vector = wapp.layerWFS(groupe, l);
      // Guichet
      else vector = wapp.layerCollabVector(l);

      // Ajouter
      this.vector.push(vector);
      layers.push(vector);

      // Probleme au chargement
      vector.on("error", function(e){
        wapp.wait(false);
        if (e.status===401) {
          wapp.message ("Impossible de charger la couche <i>"
              +(this.get('name')||this.get('title'))
              +"</i>.<i class='error'><br/>"+e.status+" - "+e.error+"</i>",
            "Connexion", { ok:"ok" });
        } else {
          wapp.alert ("Impossible de charger la couche <i>"
              +(this.get('name')||this.get('title'))
              +"</i>.<i class='error'><br/>"+e.status+" - "+e.error+"</i>");
        }
        return;
      });

      // Chargement OK > gerer load / overload
      vector.on("ready", function(){
        // Marquer le layer sur l'objet
        this.getSource().on('addfeature', function (e) {
          e.feature.layer = this; 
        }.bind(this));
        // Ooops probleme d'overload
        this.getSource().on('overload', function () {
          wapp.notification("overloading...");
        });
        // Notification de chargement
        this.getSource().on(['loadstart', 'loadend'], function (e) {
          loading[e.target.getTable().full_name] = e.remains;
          var remains=0;
          for (var i in loading) remains += loading[i];
          if (remains) {
            wapp.notification("<i class='blinking'>chargement...</i>", 5000, true);
          }
          else wapp.notification();
        });
        
        // Decompte
        nbLoad++;
        if (nb==nbLoad) wapp.notification(nb+" couches ajoutées à la carte...");
      });
    }
  }

  // Sort layers 
  const keys = Object.keys(wapp.param.visibleLayers);
  layers.sort((a,b) => keys.indexOf(a.get('name')) - keys.indexOf(b.get('name')));
  // Add sorted layers
  layers.forEach((l) => {
    // Check visibility
    guichet.getLayers().push(l);
    wapp.testHiddenLayer(l);
  });
  
  // Reset source pour la recherche
  wapp.setSearchSource ();

	if (nb) {
		wapp.notification("Chargement des guichets...");
	}
};
