/* Chargement des Layers d'un guichet */

(function() {

/**
 * Creer un layer WFS externe
 * @param {} groupe
 * @param {} l layer options
 */
wapp.layerWFS = function(groupe, l) {
  var vector;

  // Methode de chargement
  if (l.mask.loadStartegy==='all') {
    l.strategy = new ol.loadingstrategy.all();
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
  var cache = {
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
          // Obsolete (plus d'un jour)
          if ((new Date() - file.lastModified) > 24*3600*1000 ) {
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
  // Layer a charger
  vector = new ol.layer.Vector.WFS (l, cache);
  
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
  }, vector);
  // Probleme au chargement
  vector.on("error", function(e){});

  return vector;
};

/**
 * Creer un layer Webpart
 * @param {} groupe
 * @param {} l layer options
 */
wapp.layerWebpart = function(groupe, l) {
  var vector;

  var url = l.url.replace(/(.*)\?(.*)/,"$1");
  var base = l.url.replace(/.*databasename=(.*)/,"$1");
  var extent = [];
  for (var k=0; k<l.extent.length; k++) extent[k] = parseFloat(l.extent[k]);
  extent = ol.proj.transformExtent(extent, 'EPSG:4326', wapp.map.getView().getProjection());
  vector = new ol.layer.Vector.Webpart({
    url: url,
    //renderMode: 'image',
    name: l.nom,
    title: l.nom,
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
	var guichet = wapp.map.getLayersByName('guichet')[0];
console.log("loadlayer",groupe)
	// Layers du guichet
	this.vector = [];
	guichet.getLayers().clear();
	if (!groupe.layers) 
	{	guichet.set("displayInLayerSwitcher", false);
		return;
	}
	guichet.set("displayInLayerSwitcher", true);
  guichet.set("title", groupe.nom);

  // Chargement
	var nb=0, nbLoad=0;
	var loading = {};
	// Reset source pour la recherche
	wapp.setSearchSource ();
	// Ajouter les layers du guichet
	for (var i=0, l; l=groupe.layers[i]; i++)
	{	if (l.type=="WFS")
		{	nb++;
			var vector;
			// WFS externe
			if (l.external) vector = wapp.layerWFS(groupe, l);
			// Guichet
			else vector = wapp.layerWebpart(groupe, l);
			this.vector.push(vector);
			if (this.param.hidden) for (var k=0; k<this.param.hidden.length; k++)
			{	if (vector.get("name") == this.param.hidden[k]) 
				{	vector.setVisible(false);
					break;
				}
			}
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

      // Chargement OK
      vector.on("ready", function(){
        // Marquer le layer sur l'objet
        this.getSource().on('addfeature', function (e) {
          e.feature.layer = this; 
        }, this);
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

})();