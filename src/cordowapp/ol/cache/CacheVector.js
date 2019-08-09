import CordovApp from '../../Cordovapp'

/**
 * Classe pour la gestion du cache vecteur
 * @param {Cordovapp} wapp
 * @param {*} options 
 *	@param {string} options.page page du cuichet avec les boutons de chargement, "#guichet"
 */
var CacheVector = function(wapp, options) {
  var self = this;
  if (!options) options = {};

  this.page = $(options.page || '#guichet');
  this.loadPage = $(options.loadPage || '#loadGuichet');

  if (!wapp.param.vectorCache) wapp.param.vectorCache = [];

  $('.addmap', this.page).click(function(){
    self.addDialog();
  });

  $('.cancel', this.loadPage).click(function(){
    wapp.showPage(self.page.attr('id'));
  });
  $('.ok', this.loadPage).click(function(){
    self.uploadCache();
  });

  // Create dir if doesn't exist
  CordovApp.File.getDirectory (this.getCacheFileName(), null, null, true);
};

/** Layers en cache d'un guichet
 * @param {groupe} guichet
 */
CacheVector.prototype.getLayers = function(guichet) {
  var layers = [];

  function addPostcompose (l, extents) {
    l.on('postcompose', function(e){
      var canvas = document.createElement('canvas');
      canvas.width = e.context.canvas.width;
      canvas.height = e.context.canvas.height;
      var ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'rgb(255,0,0)';
      ctx.lineWidth = Math.max(30, 1000 * e.frameState.pixelRatio / e.frameState.viewState.resolution);
      ctx.scale(e.frameState.pixelRatio,e.frameState.pixelRatio);
      var rects = [];
      ctx.beginPath();
        for (var k=0, extent; extent=extents[k]; k++) {
          var p0 = wapp.map.getPixelFromCoordinate([extent[0], extent[1]]);
          var p1 = wapp.map.getPixelFromCoordinate([extent[2], extent[3]]);
          rects.push([p0[0],p0[1],p1[0]-p0[0],p1[1]-p0[1]]);
          ctx.rect(p0[0],p0[1],p1[0]-p0[0],p1[1]-p0[1]);
        }
      ctx.stroke();
      for (var k=0, r; r=rects[k]; k++) {
        ctx.clearRect(r[0],r[1],r[2],r[3]);
      }
      e.context.save();
        e.context.globalAlpha = .1;
        e.context.drawImage(canvas,0,0);
      e.context.restore();
    });
  }

  for (var i=0, c; c = wapp.param.vectorCache[i]; i++) {
    if (c.id_guichet === guichet.id_groupe) {
      var g = new ol.layer.Group({ 
        title: c.nom, 
        name: c.id_guichet+'-'+c.id, 
        baseLayer: true 
      });
      for (var k=0, l; l=c.layers[k]; k++) if (l.featureType) {
        l = wapp.layerWebpart(l, this.getCacheFileName(c,k)+'/');
        if (c.layers.length===1) l.set('displayInLayerSwitcher',false);
        g.getLayers().push(l);
        // Marquer le layer sur l'objet
        l.getSource().on('addfeature', function (e) {
          e.feature.layer = this; 
        }.bind(l));
      }
      if (g.getLayers().getLength()) {
        layers.push(g);
        var l = new ol.layer.Vector({ 
          title: 'extent',
          displayInLayerSwitcher: false,
          source: new ol.source.Vector()
        });
        addPostcompose(l, c.extents);
        g.getLayers().push(l);
      }
    }
  }
  return layers;
};

/** Set Guichet courant
 */
CacheVector.prototype.setCurrentGuichet = function(guichet) {
  this.currentGuichet = guichet;
};

/** Get Guichet courant
 */
CacheVector.prototype.getCurrentGuichet = function() {
  return this.currentGuichet;
};

/** Afficher les cartes en cache
 */
CacheVector.prototype.showList = function() {
  var ul = $('.offline ul.cartes', this.page);
  var tmp = $('[data-role="template"]', ul);
  ul.html('').append(tmp);
  if (!wapp.param.vectorCache) return;
  var self = this;
  var guichet = this.getCurrentGuichet();
  for (var i=0, cache; cache=wapp.param.vectorCache[i]; i++) {
    if (cache.id_guichet !== guichet.id_groupe) continue;
    var li = $("<li>").html(tmp.html())
      .data('cache', cache)
      .appendTo(ul);
    var ddate = new Date() - new Date(cache.date);
    if (ddate > 15*24*60*60*1000) li.addClass('err');
    else if (ddate > 7*24*60*60*1000) li.addClass('warn');
    var layerName = '';
    for (var k=0, l; l=cache.layers[k]; k++) layerName += (layerName ? ' - ':'') + l.nom;
    $(".info .layer", li).text(layerName);
    $(".info .date", li).text(cache.date);
    // Input
    $('input', li).val(cache.nom)
      .on('change', function(){
        $(this).parent().data('cache').nom = this.value;
      });
    // Buttons
    $('.fa-map-o', li).click(function(){
      self.loadCache($(this).parent().parent().data('cache'));
    });
    $('.tools-locate', li).click(function(){
      self.locateCache($(this).parent().parent().data('cache'));
    });
    $('.fa-refresh', li).click(function(){
      self.updateCache($(this).parent().parent().data('cache'));
    });
    $('.fa-trash', li).click(function(){
      self.removeCache($(this).parent().parent().data('cache'));
    });
  }
};

/**
 * Supprimer le cache
 * @param {*} cache 
 */
CacheVector.prototype.removeCache = function(cache) {
  // Remove in cache list
  for (var i=wapp.param.vectorCache.length-1; i>=0; i--) {
    if (wapp.param.vectorCache[i] === cache) {
      wapp.param.vectorCache.splice(i, 1);
    }
  }
  // Remove file on device
  var dir = this.getCacheFileName(cache);
  CordovApp.File.getDirectory(dir, function(entry){
      if (entry.isDirectory) entry.removeRecursively();
  });
  // Update
  wapp.saveParam();
  this.showList();
  var guichet = this.getCurrentGuichet();
  if (wapp.getIdGuichet()===guichet.id_groupe) wapp.setGuichet(guichet);
};

/**
 * Mettre a jour le cache
 * @param {*} cache 
 */
CacheVector.prototype.updateCache = function(cache) {
  wapp.wait("Chargement...");
  this.uploadLayers(cache);
};

/**
 * Afficher la page de chargement du cache
 * @param {*} cache 
 */
CacheVector.prototype.loadCache = function(cache) {
  wapp.showPage(this.loadPage.attr('id'));
  this.currentCache = cache;
};

/**
 * Charger l'emprise courante
 */
CacheVector.prototype.uploadCache = function() {
  var cache = this.currentCache;
  // Add current extent
  var ex = wapp.map.getView().calculateExtent(wapp.map.getSize());
  cache.extents.push(ex);
  ol.extent.extend(cache.extent, ex);
  // Get upload list
  wapp.wait("Chargement...");
  this.uploadLayers(cache);
};

/**
 * Charger les layers du cache
 * @param {*} cache 
 * @param {*} layers liste des layers a charger (interne / recursif)
 */
CacheVector.prototype.uploadLayers = function(cache, layers) {
  cache.date = (new Date()).toISODateString();
  var self = this;
  var guichet = this.getCurrentGuichet();
  if (!layers) {
    layers = [];
    for (var i=0, l; l = cache.layers[i]; i++) {
      var wp = wapp.layerWebpart(l);
      layers.push(wp);
      wp.on('ready', function(){ self.uploadLayers(cache, layers); });
      wp.on("error", function(e){
        wapp.alert ("Impossible de charger la couche <i>"
          +(this.get('name')||this.get('title'))
          +"</i>.<i class='error'><br/>"+e.status+" - "+e.error+"</i>");
      });
    }
  } else {
    var ready = true;
    for (var i=0, l; l=layers[i]; i++) {
      if (!l.getSource()) ready = false;
    }
    // Ready to load?
    if (ready) {
      // calculate tiles
      var tiles = [];
      for (var i=0, l; l=layers[i]; i++) {
        cache.layers[i].featureType = l.getFeatureType();
        tiles.push ({
          id_layer: i,
          source: l.getSource(),
          tiles: this.calculateTiles(cache, l)
       })
      }
      this.uploadTiles(cache, tiles);
      if (wapp.getIdGuichet()===guichet.id_groupe) wapp.setGuichet(guichet);
      wapp.saveParam();
      this.showList();
    }
  }
};

/**
 * Calculer les tuiles a charger
 * @param {*} cache 
 * @param {*} l 
 */
CacheVector.prototype.calculateTiles = function(cache, l) {
  var tgrid = l.getSource().getTileGrid();
  var tiles = {};
  for (var i=0, ex; ex=cache.extents[i]; i++){
    var p0 = [ex[0],ex[1]];
    var p1 = [ex[2],ex[3]];
    var t0 = tgrid.getTileCoordForCoordAndZ(p0,tgrid.getMinZoom());
    var t1 = tgrid.getTileCoordForCoordAndZ(p1,tgrid.getMinZoom());
    var z = t0[0];
    var x0 = Math.min(t0[1], t1[1]);
    var x1 = Math.max(t0[1], t1[1]);
    var y0 = Math.min(t0[2], t1[2]);
    var y1 = Math.max(t0[2], t1[2]);
    for (var x=x0; x<=x1; x++) for (var y=y0; y<=y1; y++) {
      tiles[z+'-'+x+'-'+y] = [z, x, y];
    }
  }
  var tabTiles = [];
  for (var i in tiles) tabTiles.push(tiles[i]);
  return tabTiles;
};

/**
 * Nom du fichier de cache
 * @param {*} cache 
 * @param {*} id_layer 
 * @param {*} tileCoord 
 */
CacheVector.prototype.getCacheFileName = function(cache, id_layer, tileCoord) {
  var dir = 'FILE/cache' ;
  if (!cache) return dir;
  dir += '/' + CordovApp.File.fileName ('G'+cache.id_guichet);
  if (!id_layer && id_layer!==0) return dir;
  var l = cache.layers[id_layer];
  var base = CordovApp.File.fileName(
              cache.id 
              + '-'
              + l.url.replace(/.*databasename=([^\&]*).*/,"$1") 
              + '-' 
              + l.nom 
            );
  if (!tileCoord) return dir+'/'+base;
  // Create dir if doesn't exist
  CordovApp.File.getDirectory (dir, null, null, true);
  // Filename
  return dir+'/'+base+'/'+tileCoord.join('-');
};

/**
 * Chargement des tuiles recursif
 * @param {*} cache
 * @param {*} tiles tile list
 * @param {number} pos current position
 * @param {number} size size to load
 * @param {number} error nb error
 */
CacheVector.prototype.uploadTiles = function(cache, tiles, pos, size, error) {
  var self = this;
  wapp.wait('chargement', { pourcent:50 });
  if (!size) {
    size=0;
    for (var i=0,t; t=tiles[i]; i++) {
      size += t.tiles.length;
    }
    pos = 0;
    error = 0;
  } else {
    pos++;
  }
  if (size>0) wapp.wait('chargement', { pourcent:Math.round(pos/size*100) });

  for (var i=0,t; t=tiles[i]; i++) {
    if (t.tiles.length) {
      var tgrid = t.source.getTileGrid();
      var tcoord = t.tiles.pop();
      var id = tcoord.join('-');
      var extent = tgrid.getTileCoordExtent(tcoord);
      var parameters = t.source.getWFSParam(extent, wapp.map.getView().getProjection());
      var p = "";
      for (var k in parameters) p += (p?'&':'?') +k+'='+parameters[k];
      // Chargement
      var url = (t.source.proxy_ || t.source.featureType_.wfs) + p;
      var fileName = this.getCacheFileName(cache, t.id_layer, tcoord)
      CordovApp.File.dowloadFile(
        url,
        fileName,
        function() {
          // Go on loading
          self.uploadTiles(cache, tiles, pos, size, error);
        },
        function(){
          error++;
          self.uploadTiles(cache, tiles, pos, size, error);
        }
      );
      return;
    }
  }
  // Alert on error
  if (error) {
    wapp.alert(error+ ' / ' + size + ' fichier(s) en erreur...', 'Chargement')
  } else {
    wapp.message(size + ' fichier(s) chargé(s).', 'Chargement')
  }
  //getTileCoordExtent + getWFSParam
  wapp.wait(false);
};

/**
 * Zoom to the cache extent
 * @param {*} cache 
 */
CacheVector.prototype.locateCache = function(cache) {
  wapp.map.getView().fit(cache.extent, wapp.map.getSize());
  wapp.hidePage();
};

/**
 * Ajouter une carte en cache
 * @param {sting} name nom de la carte
 * @param {Array<*>} layers liste de layer a ajouter
 */
CacheVector.prototype.addCache = function(name, layers) {
  if (!layers.length) return;
  var guichet = this.getCurrentGuichet();

  if (!wapp.param.vectorCache) wapp.param.vectorCache = [];
  var id = 0;
  for (var i=0, c; c=wapp.param.vectorCache[i]; i++) {
    id = Math.max(id, c.id||0);
  }
  var cache = {
    id: id+1,
    id_guichet: guichet.id_groupe,
    nom: name,
    layers: layers,
    date: (new Date()).toISODateString(),
    extent: ol.extent.createEmpty(),
    extents: []
  }
  wapp.param.vectorCache.push (cache);
  wapp.saveParam();
  this.showList();
  // Gestion de l'aide
  wapp.help.show("guichet-hors-ligne");
};

/** Dialogue d'ajout de carte
 */
CacheVector.prototype.addDialog = function() {
  var self = this;
  var guichet = this.getCurrentGuichet();
  var content = CordovApp.template('dialog-guichet');
  var ul = $('ul.layerselect', content);
  for (var i=0, l; l = guichet.layers[i]; i++) {
    if (l.type === 'WFS') {
      $("<li>").addClass('selected')
        .attr('data-input','')
        .text(l.nom)
        .data('layer', l)
        .click(function(){
          var li = $(this).toggleClass('selected').addClass('active');
          setTimeout (function(){
            li.removeClass('active');
          }, 200);
        })
        .appendTo(ul);
    }
  }

  wapp.dialog.show (content, {
    title: "Ajouter une carte", 
    buttons: { ajouter:"Ajouter...", cancel:"Annuler" },
    className: "attributes guichet",
    callback: function(b) {
      if (b=='ajouter') {
        var name = $('input',content).val() || 'Sans titre';
        var layers = [];
        $("li", ul).each(function() {
          var l = $(this).data('layer');
          if ($(this).hasClass('selected')) layers.push($.extend({},l));
        });
        self.addCache(name, layers);
      }
    }
  });
};

export default CacheVector
