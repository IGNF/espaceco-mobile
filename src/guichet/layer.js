import wapp from '../wapp'
import CordovApp from '../cordowapp/Cordovapp'

import {all as ol_loadingstrategy_all} from 'ol/loadingstrategy'
import ol_layer_Vector_WFS from '../cordowapp/ol/layer/WFS'
import {boundingExtent as ol_extent_boundingExtent} from 'ol/extent'
import {transformExtent as ol_proj_transformExtent} from 'ol/proj'

import ol_layer_Group from 'ol/layer/Group'
import ol_layer_Vector_Webpart from '../cordowapp/ol/layer/Webpart'

/**
 * Creer un layer WFS externe
 * @param {} groupe
 * @param {} l layer options
 */
wapp.layerWFS = function(groupe, l) {
  var vector;

  // Methode de chargement
  if (l.mask.loadStartegy==='all') {
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
        CordovApp.File.getDirectory('FILE/cache', 
          function() {
            CordovApp.File.write(
              fileName, 
              response,
              options.success,
              options.error
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
        CordovApp.File.info(
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
              CordovApp.File.read(
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
  };
  // Layer a charger
  vector = new ol_layer_Vector_WFS (l, cache);
  
  // Menage
  delete l.strategy;
  delete l.authentication;

  //
  vector.set('logo', groupe.logo);
  vector.set('attach', l.mask.joinData);
  // Chargement OK
  vector.once('ready', function() { 
      // Sauvegarde login / pwd
      wapp.ripart.saveParam();
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
  vector.on("error", function(e){});

  return vector;
};

/**
 * Creer un layer Webpart
 * @param {} l layer options
 */
wapp.layerWebpart = function(l, cacheUrl) {
  var vector;

  var url = l.url.replace(/(.*)\?(.*)/,"$1");
  // var base = l.url.replace(/.*databasename=(.*)/,"$1");
  var base = l.url.replace(/.*databasename=([^\&]*).*/,"$1");
  var extent = [];
  for (var k=0; k<l.extent.length; k++) extent[k] = parseFloat(l.extent[k]);
  extent = ol_proj_transformExtent(extent, 'EPSG:4326', wapp.map.getView().getProjection());
  vector = new ol_layer_Vector_Webpart({
    url: url,
    //renderMode: 'image',
    name: l.nom,
    title: l.nom,
    cacheUrl: cacheUrl,
    featureType: l.featureType,
    database: base,
    extent: extent,
    username: wapp.ripart.getUser(),
    password: wapp.ripart.getUser(true),
    // style: guichet.style,
    maxResolution: 40, // zoom 13
    checkSourceOptions: function (options, featureType) {
      // Limiter la taille des tuilles en fonction du minZoom
      options.tileZoom = Math.max(featureType.minZoomLevel-2, 4);
    }
  },{
    // preserved: select.getFeatures(),
    filter: (base=="bduni_metropole" ? {detruit:false} : {}),
    // Tile zoom to calculate tiles
    tileZoom: 13,
    maxFeatures: 5000,
    maxReload: wapp.param.options.maxReload || 10000
  });

  return vector;
};

/** Chargement des layers d'un guichet
 * @param {} groupe
 */
wapp.loadLayers = function (groupe) {
  	// Layer du guichet
	var guichet = wapp.map.getLayers().getArray().find((l) => l.get('name') ==='guichet')

  // Layers du guichet
	this.vector = [];
	guichet.getLayers().clear();
	if (!groupe.layers) {
    guichet.set("displayInLayerSwitcher", false);
		return;
	}
	guichet.set("displayInLayerSwitcher", true);
  guichet.set("title", 'Guichet: '+groupe.nom);

  var hiddenLayers = this.param.hidden || [];
  function testHiddden (layer) {
    for (var k=0; k<hiddenLayers.length; k++){
      if (layer.get("name") == hiddenLayers[k]) {
      	layer.setVisible(false);
        break;
      }
    }
    if (layer.getLayers) {
      layer.getLayers().forEach(function(l){
        testHiddden(l);
      });
    }
  };

  // Layers en cache
  var cache = wapp.vectorCache.getLayers(groupe);
  if (cache.length) {
    var c = new ol_layer_Group({ 
      title: guichet.get('title')+' (en ligne)', 
      name: groupe.id_groupe+'-0',
      baseLayer: true 
    });
    guichet.set('openInLayerSwitcher', true);
    testHiddden(c);
    var visible = c.getVisible();
    for (var i=0; i<cache.length; i++) {
      // Un seu lvisible
      testHiddden(cache[i]);
      if (!visible) visible = cache[i].getVisible();
      else cache[i].setVisible(false);
      guichet.getLayers().push(cache[i]);
    }
    guichet.getLayers().push(c);
    guichet = c;
  }

  // Chargement
	var nb=0, nbLoad=0;
	var loading = {};
	// Reset source pour la recherche
	wapp.setSearchSource ();
	// Ajouter les layers du guichet
	for (var i=0, l; l=groupe.layers[i]; i++) {
    if (l.type=="WFS") {
      nb++;
			var vector;
			// WFS externe
			if (l.external) vector = wapp.layerWFS(groupe, l);
			// Guichet
      else vector = wapp.layerWebpart(l);
      // Ajouter
      this.vector.push(vector);
      testHiddden(vector);
      guichet.getLayers().push(vector);

      // Probleme au chargement
      vector.on("error", function(e){
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
        this.getSource().on('overload', function (e) {
          wapp.notification("overloading...");
        });
				// Notification de chargement
				this.getSource().on(['loadstart', 'loadend'], function (e) {
					loading[e.target.getFeatureType().fullName] = e.remains;
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
  
	// Mettre les signalements en haut de la pile de calque
	if (nb) 
	{	wapp.map.removeLayer(wapp.ripart.layer);
		wapp.map.addLayer(wapp.ripart.layer);
		wapp.notification("Chargement des guichets...");
	}
};
