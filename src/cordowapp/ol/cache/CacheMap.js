import _T from '../../i18n'

import CordovApp from '../../Cordovapp'
import ol_cache_Tile from './CacheTile'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import ol_layer_Vector from 'ol/layer/Vector'
import ol_source_Vector from 'ol/source/Vector'
import {createEmpty as ol_extent_createEmpty} from 'ol/extent'
import {extend as ol_extent_extend} from 'ol/extent'

/** Sauvegarde des tuilles en cache
 * Les cartes sont sauvegardees dans wapp.param.cacheMap.
 * Les cartes sont automatiquement ajoutees au LayerGroup name="cache"
 * @param {Cordovapp} wapp
 * @param {ol.layer.Group} layerGroup LayerGroup contenant les cartes en cache
 * @param {*} options
 *  @param {string} options.loadPage page de chargement avec les boutons de chargement, "#loadMap"
 *  @param {string} options.listMap element pour la liste de cartes, '#cartes [data-list="maps"] ul'
 *  @param {string} options.directory repertoire de sauvegarde, default SD
 *  @param {string} options.dirName sous-repertoire de sauvegarde, default geoportail
 *  @param {string} options.apiKey cle geoportail, default celle de la map
 *  @param {string} options.authentication authentication de la cle, default celle de la map
 */
const CacheMap = function(wapp, layerGroup, options) {
  var self = this;

  const map = wapp.map;

  // Sort cache on layer order when order change
  layerGroup.getLayers().on('remove', function(e) {
    var layers = layerGroup.getLayers().getArray();
    setTimeout(function(){
      wapp.param.cacheMap.sort(function (a,b) {
        var ia = layers.findIndex( function(l) { 
          return l.get('name')==='cache_'+a.id
        });
        var ib = layers.findIndex( function(l) { 
          return l.get('name')==='cache_'+b.id
        })
        return ia - ib;
      });
      wapp.saveParam();
    }, 0);
  });

  var apiKey = options.apiKey;
  var authentication = options.authentication;
  var dirName = options.dirName || "geoportail";
  function getPath() {
    return (wapp.param.options.cacheRoot||"")+dirName+"/";
  }
    
  // Carte en cours d'edition
  var currentMap;
  var currentId = 0;

  this.listMap = $(options.listMap);
  this.liTemplate = $('[data-role="template"]', this.listMap).html();
  this.page = this.listMap.closest('[data-role="page"]');
  var loadPage = this.loadPage = $(options.loadPage);

  var vector = new ol_layer_Vector({ 
    name:"Emprises", 
    source: new ol_source_Vector(),
    displayInLayerSwitcher: false
  });
  layerGroup.getLayers().push(vector);

  // Afficher un pattern 
  (function(){
    var pattern;
    var c = document.createElement('canvas');
    var ctx = c.getContext("2d");
    var image = new Image();
    image.onload = function() {
      pattern = ctx.createPattern(image,"repeat");
    };
    image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAMAAAAolt3jAAAAGFBMVEUAAACPjwCmpgCbmwCCggD+/gCXlwD//wDWAMTYAAAAB3RSTlOAsr64rP62hR4cWgAAADpJREFUCNetzTEOACAIA8ACYv//YwVJxF0mLm0AJAUxtjeCPq6IkvKwNYM9c/ko1AdLTLxNtEyZbFcWKysC1htDphIAAAAASUVORK5CYII='

    vector.on('postcompose', function (e) {
      e.context.save();
        e.context.fillStyle = pattern;
        e.context.globalAlpha = .3 * layerGroup.getOpacity();
        e.context.scale(e.frameState.pixelRatio,e.frameState.pixelRatio);
        e.context.beginPath();
        layerGroup.getLayers().forEach(function(l) {
          if (l.getVisible()) {
            var cache = getCacheMapById(l.get('name').replace('cache_',''));
            if (cache && cache.minZoom-2 > map.getView().getZoom()) {
              for (var k=0, extent; extent=cache.extents[k]; k++) {
                var p0 = map.getPixelFromCoordinate([extent[0], extent[1]]);
                var p1 = map.getPixelFromCoordinate([extent[2], extent[3]]);
                e.context.rect(p0[0],p0[1],p1[0]-p0[0],p1[1]-p0[1]);
              }
            }
          }
        });
        e.context.fill();
      e.context.restore();
    });
  })();

  // Chargement des cartes lorsque le cacheRoot est OK
  if (!wapp.param.options.cacheRoot || cordova.platformId==='ios'){
    CordovApp.File.getDirectory(options.directory||'FILE', function(d){
      wapp.param.options.cacheRoot = d.nativeURL;
      initCacheMap()
    },
    initCacheMap);
  } else { 
    initCacheMap();
  }

  // Initialisation
  loadPage.addClass('noTile');
  $('.ok', this.loadPage).click(function() {
    if (!loadPage.hasClass('noTile')) loadMapDlg();
  });
  $('.cancel', this.loadPage).click(cancelLoadMap);
  $('.addmap', this.page).click(function() { addCacheMap(); });
  $('.savemap', this.page).click(saveCacheFile);

  /**
   * Show info
   */
  function showInfo() {
    var extent = map.getView().calculateExtent(map.getSize());
    var layerName = currentMap.layer||"GEOGRAPHICALGRIDSYSTEMS.MAPS";
    var layercache = new ol_layer_Geoportail(layerName, { hidpi: false, key: apiKey }, { gppKey: apiKey, authentication: authentication });
    var cache = new ol_cache_Tile (layercache, { authentication: authentication });

    cache.estimateSize (function(s){
      if (s.length<0) {
        loadPage.addClass('noTile');
      } else {
        loadPage.removeClass('noTile');
        $(".tileCount .size", loadPage).text(s.size);
        $(".tileCount .length", loadPage).text(s.length);
        // Hours
        if (s.time>60000*60) {
          var mn = Math.round(s.time/60000);
          var h = Math.floor(mn/60);
          mn -= h*60;
          $(".tileCount .time", loadPage).text(h+" h "+mn);
        }
        // minutes
        else {
          $(".tileCount .time", loadPage).text(Math.round(s.time/60000)||"-");
        }
      }
    }, currentMap.minZoom, currentMap.maxZoom, extent);
    
/*
    content.addClass("loading");
    var vmin = Number(min.val());
    var vmax = Math.min (18, Number(max.val()));
    if (vmax-vmin>5) vmax = vmin+5;
    max.val(vmax);
    setTimeout(function()
    {	cache.estimateSize (setSize, vmin, vmax, extent);
    }, 100);
*/
  };
  $(this.loadPage).on('showpage', function(){
    map.on('moveend', showInfo);
    showInfo();
  })
  .on('hidepage', function(){
    map.un('moveend', showInfo);
  })

  // Update on show
  $(this.page).on("showpage", function(e) {
    showWroot();
  });


  /**
   * Chargement des cartes
   */
  function initCacheMap() {
    if (!wapp.param.cacheMap) wapp.param.cacheMap=[];
    for (var i=0; i<wapp.param.cacheMap.length; i++) {
      var cmap = wapp.param.cacheMap[i];
      addCacheMap(cmap);
    }
  }

  /* Show root dir
  */
  function showWroot() {
    if (wapp.param.options.cacheRoot) $(".cacheroot", self.page).text(CordovApp.File.getFileName(wapp.param.options.cacheRoot.replace(/\/$/,"")));
    else $(".cacheroot", self.page).text("-");
  };

  // Carte en cache
  var CacheMap = function (title) {
    this.nom = title;
    this.length = 0;
    this.date = (new Date()).toISODateString();
    this.minZoom = 15;
    this.maxZoom = 15;
    this.extent = ol_extent_createEmpty();
    this.extents = [];
  };

  /* Recupere un liste des id-fichier de la carte
  *	@param {CacheMap} smap la carte 
  *	@param {function} callback fonction qui renvoie la liste et le nombre de fichiers concernes
  *	@param {} list a modifier, default liste vide
  *	@param {boolean} remove si true supprime les fichiers de la liste, default false
  */
  function getCacheFiles(smap, callback, list, remove) {
    // File list
    var lfile = {};
    if (list) lfile = list;
    if (!smap.extents.length) {
      callback(lfile, 0);
      return;
    }
    var layercache = new ol_layer_Geoportail(smap.layer||"GEOGRAPHICALGRIDSYSTEMS.MAPS", { hidpi: false, key: apiKey });
    var cache = new ol_cache_Tile (layercache, { authentication: authentication });
    // 
    var nb = 0;
    var pos = 0;
    // Fin de list
    cache.on("saveend", function(e) {
      // Suivant
      pos++;
      if (pos<smap.extents.length) {
        cache.save(smap.minZoom, smap.maxZoom, smap.extents[pos]);
      } else {
        callback(lfile, nb);
      }
    });
    // Nouveau fichier a traiter
    cache.on("save", function(e) {
      if (remove) {
        if (lfile[e.id]) {
          lfile[e.id] = false;
          nb++;
        }
      } else {
        if (!lfile[e.id]) {
          lfile[e.id] = e;
          nb++;
        }
      }
    });
    // Lancer la recherche
    cache.save(smap.minZoom, smap.maxZoom, smap.extents[pos]);
  };

  /* Supprimer les fichiers de la carte du cache
  *	@param {CacheMap} smap carte a supprimer
  */
  function removeCacheFiles(smap) {
    // Carte non chargee
    if (!smap.length) return;
    // Supprimer les fichiers
    var todel = {};
    var pos = 0;

    // Supression des fichiers sur le disque
    function deleteFiles() {
      // Tout supprimer (on n'a plus rien)
      if (!wapp.param.cacheMap.length) {
        CordovApp.File.listDirectory(getPath(), function(entries){
          for (var i=0, entry; entry = entries[i]; i++) {
            if (entry.isDirectory) entry.removeRecursively();
          }
        });
      }
      // Ne supprimer que les fichiers demandes
      else {
        for (var i in todel) {
          if (todel[i]) CordovApp.File.delFile (getPath()+smap.layer+"/"+i);
        }
      }
      smap.length = 0;
      updateCacheMapInfo (smap);
      wapp.wait(false);
    }

    // Restaurer les fichiers utilises par d'autres cartes
    function restoreFiles() {
      // Fin de la liste
      if (pos >= wapp.param.cacheMap.length) {
        setTimeout (deleteFiles, 200);
      } else if (wapp.param.cacheMap[pos]===smap || !wapp.param.cacheMap[pos].length) {
        // Carte en cours
        // Suivant
        pos++;
        restoreFiles();
      } else {
        // Autre carte
        var cmap = wapp.param.cacheMap[pos];
        // Ne pas supprimer les fichiers utilises par d'autres
        getCacheFiles(cmap, function (l)
          {	todel = l;
            // suivant
            pos++;
            restoreFiles();
          }, todel, true);
      }
    }
  
    wapp.wait("Supression...");
    setTimeout (function() {
      // Fichiers de la carte
      getCacheFiles (smap, function(list) {
        todel = list;
        restoreFiles();
      });
    }, 200);
  };

  /* Supprimer la carte du cache
  *	@param {CacheMap} smap carte a supprimer
  *	@param {boolean} noprompt pour sauter l'etape de confirmation
  */
  function removeCacheMap(smap, noprompt) {
    wapp.help.hide();
    // Ask for deletion
    if (!noprompt) {
      wapp.message(_T("Voulez-vous supprimer la carte ?"), _T("Suppression"), [_T("Annuler"),_T("OK")],
        function (button) {
          if (button == "2") {
            removeCacheMap(smap,true);
          }
        }
      );
      return;
    }
    // Remove from params
    for (var i=0; i<wapp.param.cacheMap.length; i++) {
      if (wapp.param.cacheMap[i] === smap) wapp.param.cacheMap.splice(i,1);
    }
    // Remove associated list
    var l = $('li', self.listMap);
    for (var i=0; i<l.length; i++) {
      if ($(l[i]).data("map")===smap) {
        l[i].remove();
        break;
      }
    }

    // Remove associated layers
    var layercache = layerGroup.getLayers().getArray().find((l) => {
      return l.get('name') === 'cache_'+smap.id;
    });
    layerGroup.getLayers().remove(layercache);

    // Remove associated files
    removeCacheFiles (smap);
  };

  /* Mettre a jour les info de la carte
  *	@param {CacheMap} smap carte a afficher
  */
  function updateCacheMapInfo (smap) {
    var li, l = $('li', self.listMap);
    for (var i=0; i<l.length; i++) {
      if ($(l[i]).data("map")===smap) {
        li = l[i];
        break;
      }
    }
    if (li) {
      var layerName = new ol_layer_Geoportail(smap.layer).get('name')
      $(".info .layer", li).text(layerName+" : z"+smap.minZoom);
      $(".info .dalle", li).text(smap.length);
      $(".info .date", li).text(smap.date);
    }
  };

  /* Page de chargement
  *	@param {CacheMap} smap carte a charger
  */
  function loadCacheMap(smap)	{	
    if (wapp.ripart.param.offline) {
      currentMap = smap;
      wapp.showPage(self.loadPage.attr('id'));
    }
    else {
      wapp.alert ($(".nomap",self.listMap.parent()).html(), "Mode hors-ligne");
    }
  };

  /* Mise a jour d'une carte
  *	@param {CacheMap} smap carte a charger
  */
  function refreshCacheMap(smap)	{	
    if (wapp.ripart.param.offline) {
      wapp.wait("Mise à jour...");
      setTimeout (function() {
        // Fichiers de la carte
        getCacheFiles (smap, function(list) {
          var t = [];
          for (var i in list) t.push(list[i]);
          smap.length = t.length; 
          downloadTiles(t, smap.layer, function(){
            // Mise a jour
            smap.date = (new Date()).toISODateString();
            updateCacheMapInfo (smap);
            setLayerCache(smap);
            wapp.wait(false);
          })
        });
      }, 200);
    } else {
      wapp.alert ($(".nomap",self.listMap.parent()).html(), "Mode hors-ligne");
    }
  };


  /** Chargement d'une liste de fichiers
   * @param {Array} t
   * @param {string} layer layer name
   * @param {function} cback callback
   * @param {number} nb number of element to process
   * @param {number} nberr number of file not loaded
   */
  function downloadTiles(t, layer, cback, nb, nberr) {
    if (nb===undefined) {
      nb = t.length;
      nberr = 0;
    }
    var path = getPath()+layer+"/";
    var e = t.pop();
    if (e) {
      var pos = (nb+nberr-t.length);
      wapp.wait("Chargement... "+pos+"/"+(nb+nberr), { pourcent: pos/(nb+nberr) * 100 });
      var options = {};
      if (authentication) {
        options = {	
          headers: {
            'Authorization': "Basic "+authentication
          }
        }
      }
      // Download
//			console.log("saving: "+path+e.id)
      CordovApp.File.dowloadFile (
        decodeURIComponent(e.url), 
        path+e.id, 
        function() {
          // Suivant
          downloadTiles(t, layer, cback, nb, nberr);
        }, 
        function(e) {
          // console.log(e);
          // Fichier non charge
          nb--;
          nberr++;
          // Suivant
          downloadTiles(t, layer, cback, nb, nberr);
        }, 
        options);
    } else {
      wapp.wait(false);
      if (nberr) {
        wapp.message(nb+" fichiers chargés.\n"
          +nberr+" fichier(s) en erreur ou hors zone...",
          "Chargement", ["OK"]);
      } else {
        wapp.notification(nb+" fichiers chargés.");
      }
      cback();
    }
  };

  /* Chargement 
  */
  function downloadMap(layercache, min, max, extent) {
    // Cache pour le chargement
    console.log("download")
    var cache = new ol_cache_Tile (layercache, { authentication: authentication });
    var t=[];
    // Create dir if doesn't exist
    CordovApp.File.getDirectory (getPath(), null, null, true);
    // Start 
    cache.on("savestart", function(e) {
      wapp.wait("Chargement...");
    });
    // End => load tiles
    cache.on("saveend", function(e) {
      currentMap.minZoom = min;
      currentMap.maxZoom = max;
      currentMap.layer = layercache.get("layer");
      if (!currentMap.extent) currentMap.extent = ol_extent_createEmpty();
      currentMap.extent = ol_extent_extend (currentMap.extent, extent);
      currentMap.extents.push (extent);
      wapp.saveParam();
      downloadTiles (t, layercache.get("layer"), function(){
        setLayerCache (currentMap);
        currentMap.date = (new Date()).toISODateString();
        updateCacheMapInfo (currentMap);
        getCacheFiles (currentMap, function(l,n) {
          currentMap.length = n; 
          updateCacheMapInfo (currentMap);
        });
      })
    });
    // Add a new tiel
    cache.on("save", function(e) {
      t.push(e);
    });

    // Start loading
    cache.save(min, max, extent);
  }

  /* Dialogue de chargement d'une carte
  */
  function loadMapDlg() {
    var layerName = currentMap.layer||"GEOGRAPHICALGRIDSYSTEMS.MAPS";
    var layercache = new ol_layer_Geoportail(layerName, { hidpi: false, key: apiKey });

    var cache = new ol_cache_Tile (layercache, { authentication: authentication });

    var extent = map.getView().calculateExtent(map.getSize());

    // Dialogue
    var content = CordovApp.template("dialog-loadmap");
    wapp.setParamInput(
      content, {
        layer: layerName 
      },
      function(r) {
        layercache = new ol_layer_Geoportail (r.val, { hidpi: false, key: apiKey });
        cache = new ol_cache_Tile (layercache, { authentication: authentication });
        if (min) estimate();
      });
    //if (currentMap.extents.length) 
    $("[data-input]", content).attr('data-disabled', true);

    var min = $(".min", content).on("change", estimate).val(typeof(currentMap.minZoom)!="undefined" ? currentMap.minZoom : 15);
    var max = $(".max", content).on("change", estimate).val(typeof(currentMap.maxZoom)!="undefined" ? currentMap.maxZoom : 15);
    // Si une emprise est deja chargee, on ne peux plus changer le zoom
    if (currentMap.extents.length) {
      min.prop("disabled",true);
      max.prop("disabled",true);
    }
    
    wapp.dialog.show (content, {
      title: "Chargement...", 
      buttons: { charger:"Charger...", cancel:"Annuler" },
      callback: function(b) {
        if (b=='charger') {
          downloadMap (layercache, Number(min.val()), Number(max.val()), extent);
        }
      }
    });

    CordovApp.File.getFreeDiskSpace(function(s){
      $(".free", content).text(Math.round(s/1024/1024*10)/10);
    });
    
    function setSize(s) {
      content.removeClass("loading");
      $(".size", content).text(s.size);
      $(".length", content).text(s.length);
      // Hours
      if (s.time>60000*60) {
        var mn = Math.round(s.time/60000);
        var h = Math.floor(mn/60);
        mn -= h*60;
        $(".time", content).text(h+" h "+mn);
      } else {
        // minutes
        $(".time", content).text(Math.round(s.time/60000)||"-");
      }
    }
    function estimate() {
      //$(".minimg", content).attr("src", layercache);
      content.addClass("loading");
      var vmin = Number(min.val());
      var vmax = Math.min (18, Number(max.val()));
      if (vmax-vmin>5) vmax = vmin+5;
      max.val(vmax);
      setTimeout(function() {
        cache.estimateSize (setSize, vmin, vmax, extent);
      }, 100);
    }
    content.addClass("loading");
    setTimeout (estimate,500);
  };

  /* Annule le chargement de carte (ferme la page)
  */
  function cancelLoadMap () {
    wapp.showPage(self.page.attr("id"));
  };

  /* Procedure de chargement d'une carte
   *	@param {CacheMap} smap carte a charger
   */
  function setLayerCache (smap) {

    // Layer de la carte
    var layercache = layerGroup.getLayers().getArray().find((l) => {
      return l.get('name') === 'cache_'+smap.id
    });
    if (layercache) {
      // Lecture du cache
      var cache = new ol_cache_Tile (layercache, {
        read: function(tile, callback) {
          if (wapp.isCordova) callback (getPath()+smap.layer+"/"+tile.id);
          else callback(tile.src);
        },
        authentication: authentication
      });
      cache.restore (smap.minZoom, smap.maxZoom, smap.extent);
    }
  }

  /* Recuperation d'une carte par son nom
  *	@param {string} name
  */
  function getCacheMapByName(name) {
    for (var i=0, c; c=wapp.param.cacheMap[i]; i++) {
      if (c.nom == name) return c;
    }
    return null;
  }

  /* Recuperation d'une carte par son id
  *	@param {string} id
  */
  function getCacheMapById(id) {
    if (wapp.param.cacheMap) { 
      for (var i=0, c; c=wapp.param.cacheMap[i]; i++) {
        if (c.id == id) return c;
      }
    }
    return null;
  }

  /** Charger un fichier de cache */
  function loadCacheFile(name) {
    console.log(name);
    wapp.dialog.close();
    // addCacheMap(smap)
    CordovApp.File.read (name, function(cache){
      var smap = JSON.parse(cache);
      smap.length = 0;
      smap.date = (new Date()).toISODateString();
      delete smap.id;
      wapp.param.cacheMap.push(smap);
      addCacheMap(smap);
      wapp.notification("Une emprise ajouté.");
    }, function(){
      wapp.alert("Impossible de charger l'emprise...");
    })
  }

  /** Enregistrer les fichiers de cache sur l'appareil
   */
  function saveCacheFile() {
    if (window.cordova) {
      var content = CordovApp.template("dialog-savecache");
      var path = "SD/"+ (cordova.platformId === 'ios' ? "" : "guichet/");
      function addEntry(entry) {
        $("<li>").text(entry.name)
        .click(function() {
          loadCacheFile(path+entry.name);
        })
        .appendTo($("ul", content));
      }
      CordovApp.File.listDirectory (path, function(entry) {
        for (var i=0; i<entry.length; i++) {
          if (!entry[i].isDirectory && /\.cache$/.test(entry[i].name)) {
            addEntry(entry[i]);
          }
        }
      });
      wapp.dialog.show(content, {
        title: "Gestion des emprises",
        buttons: { save:'Enregistrer', cancel: 'Annuler' },
        callback: function (b) {
          if (b==='save') {
            var cache = wapp.param.cacheMap;
            if (cache.length) {
              for (var i=0, c; c = cache[i]; i++) {
                var filename = path + CordovApp.File.fileName(c.nom) + ".cache";
                CordovApp.File.write (filename, JSON.stringify(c))
              }
            }
            var s = cache.length>1 ? 's' : '';
            wapp.message(cache.length+' fichier'+s
              +' enregistré'+s+' dans le répertoire '+path);
          }
        }
      });
    }
  }

  /* Ajoute une carte a l'application : layer / 
  *	@param {CacheMap|undefined} smap carte a charger sinon en cree un nouvelle
  */
  function addCacheMap(smap) {
    // Creer une carte ?
    if (!smap) {
      var c = wapp.param.cacheMap.length;
      while (true) {
        c++;
        if (!getCacheMapByName("Carte #"+c)) break;
      }
      smap = new CacheMap ( "Carte #"+c );

      var content = CordovApp.template("dialog-addmap");
      wapp.setParamInput( content, smap);
  
      wapp.dialog.show (content, {
        title: "Ajouter une carte", 
        buttons: { ajouter:"Ajouter...", cancel:"Annuler" },
        className: "attributes",
        callback: function(b) {
          if (b=='ajouter') {
            smap.maxZoom = smap.minZoom = parseInt(smap.minZoom);
            wapp.param.cacheMap.push(smap);
            addCacheMap(smap)
          }
        }
      });
      return;
    }

    // Visible ?
    var isVisible = (typeof(smap.id)!="undefined") ? $.inArray("cache_"+smap.id, wapp.param.layers)>=0 : true;
    smap.id = currentId++;

    // Ajouter un layer a la carte (juste avant les layers vecteur)
    var layercache = new ol_layer_Geoportail(smap.layer||"GEOGRAPHICALGRIDSYSTEMS.MAPS", {
      hidpi: false, 
      visible: isVisible 
    });
    layercache.set('title', smap.nom);
    layercache.set('name', 'cache_'+smap.id);
    layerGroup.getLayers().push(layercache);
    setLayerCache (smap);
  
    // Page d'info
    var li = $("<li>").html(self.liTemplate)
        .data("map", smap)
        .appendTo(self.listMap);
    $("input",li).val(smap.nom)
      .on('change', function() {
        smap.nom = $(this).val();
        map.getLayersByName("cache_"+smap.id)[0].set("title", smap.nom);
      });

    // Suppression d'une carte
    $(".fa-trash",li).on ("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      removeCacheMap(smap);
    });
    // Choix des tuilles de la carte
    $(".fa-map-o",li).on ("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      loadCacheMap(smap);
    });
    // Refresh map
    $(".fa-refresh",li).on ("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      refreshCacheMap(smap);
    });
    // Zoom to extent
    $(".tools-locate",li).on ("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (smap.extents.length) {
        map.getView().fit(smap.extent, map.getSize());
        wapp.hidePage();
      }
    });
  
    // Gestion de l'aide
    if (wapp.getPage()==self.page.attr('id')) {
      wapp.help.show("cartes-hors-ligne");
    }
  
    updateCacheMapInfo (smap);

  };

  /** Choix du repertoire de travail 
  *	Le repertoire est stocke dans la variable 'wapp.param.options.cacheRoot'
  */
  this.getCacheDir = function() {
    wapp.fileDialog (
      wapp.param.options.cacheRoot||'FILE', 
      function(url) {
        CordovApp.File.testWriteDir(url,
          function() {
            wapp.message(url,"Répertoire de travail");
            wapp.param.options.cacheRoot = url;
            showWroot();
          },
          function() {
            CordovApp.File.getApplicationDirectory(url,
              function (dir) {
                wapp.message ("Répertoire non accesible en écriture.<br/>"
                  +"Voulez-vous utiliser le répertoire : "+dir.nativeURL,
                  "Répertoire de travail",
                  { ok:"Oui",cancel:"Annuler" },
                  function(button) {
                    if (button='ok') wapp.param.options.cacheRoot = dir.nativeURL;
                    showWroot();
                  });
              },
              function() {
                wapp.message ("Impossible d'écrire sur ce répertoire...","Répertoire de travail");
              });
          });
      }, 
      { dir:true }
    );
  };
};

export default CacheMap
