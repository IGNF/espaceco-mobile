import ol_source_Vector from 'ol/source/Vector'
import ol_Collection from 'ol/Collection'
import ol_format_WFS from 'ol/format/WFS'
import ol_format_GeoJSON from 'ol/format/GeoJSON'
import { tile as ol_loadingstrategy_tile } from 'ol/loadingstrategy'
import { bbox as ol_loadingstrategy_bbox } from 'ol/loadingstrategy'
import { createXYZ as ol_tilegrid_createXYZ } from 'ol/tilegrid'
import { transformExtent as ol_proj_transformExtent } from 'ol/proj'
import Ajax from 'ol-ext/util/Ajax'

import { ol_ext_inherits } from 'ol-ext/util/ext'

/** ol_source_Vector_WFS
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger loadstart, loadend, overload
 * @param {any}
 * @returns {ol_source_Vector_WFS}
 */
const ol_source_Vector_WFS = function(options, cache) {
  options = options || {};
  
  // Proxy to load features
  this.proxy_ = options.proxy;

  // Authentification
  this.username = options.username;
  this.password = options.password;

  this.featureFilter_ = options.filter || {};
  
  // Strategy for loading source (custom or bbox or tile)
  var strategy = options.strategy;
  if (!strategy && options.minZoom) {
    var tileZoom = options.tileZoom || (options.minZoom+2);
    this.tiled_ = true;
    this._tileGrid = ol_tilegrid_createXYZ({ minZoom: tileZoom, maxZoom: tileZoom, tileSize:options.tileSize||256  }),
    strategy = ol_loadingstrategy_tile (this._tileGrid);
  } else {
    strategy = ol_loadingstrategy_bbox;
  }

  if (this.tiled_) this.maxReload_ = options.maxReload;

  if (cache && cache.loadCache) {
    this.loadCache = cache.loadCache;
  }
  if (cache && cache.saveCache) {
    this.saveCache = cache.saveCache;
  }

  // Inherits
  ol_source_Vector.call(this, {
    // Loader function
    loader: this.loaderFn_,
    // bbox strategy
    strategy: strategy,
    // Features
    features: new ol_Collection(),
    // ol.source.Vector attributes
    attributions: options.attribution,
    useSpatialIndex: true, // force to true for loading strategy tile
    wrapX: options.wrapX
  });

  this.set('url', options.url);
  var cachedir = options.url.replace(/^((http[s]?|ftp):\/)?\/?([^:/\s]+)((\/\w+)*\/)([\w\-.]+[^#?\s]+)(.*)?(#[\w-]+)?$/,"$3").replace(/\./g,'_');
  this.set('cache', cachedir + '/' + options.typename);
  this.set('once', options.once);
  this.set('typename', options.typename);
  this.set('version', options.version);
  this.set('projection', options.srs||'EPSG:4326');
  this.set('id', options.mask ? options.mask.id : -1);
  this.set('maxFeatures', options.maxFeatures)
  this.set('format', options.format)
};
ol_ext_inherits(ol_source_Vector_WFS, ol_source_Vector);

/** Set User */
ol_source_Vector_WFS.prototype.setUser = function(user, pwd) {
  this.username = user;
  this.password = pwd;
};

/**
 * Loader
 * @private
 */
ol_source_Vector_WFS.prototype.loaderFn_ = function(extent, resolution, projection) {
  // Load once
  if (this._done && this.get('once')) return;
  this._done = true;
  // 
  var self = this;

  // WFS parameters
  extent = ol_proj_transformExtent (extent, projection, this.get('projection'));
  var parameters = {
    service	: 'WFS',
    request: 'GetFeature',
		outputFormat: this.get('format'),
    typeName: this.get('typename'),
		bbox: extent.join(','),             // WFS standard ?
//    boundedBy: extent.join(','),      // ??? sylvamap ???
    maxFeatures: this.get('maxFeature'),
    filter: this.featureFilter_,
    srsname:'EPSG:4326',
    version: this.get('version')
  };
  // WFS request
  this.dispatchEvent({ type:"loadstart", remains:++this.tileloading_ } );
  // Load Cache
  this.loadCache({
    extent: extent, 
    resolution: resolution, 
    // Cache charge
    success: function(response) {
      self.handleResponse_(response, projection);
    },
    // On error => load online
    error: function(cacheError) {
      Ajax.get({
        url: self.get('url'),
        headers : { "cache-control": "no-cache" },
        cache: false,
        dataType: "text",
        data: parameters,
        // Timout 3mn
        timeout: 3*60*1000,
        // Authentification
        auth: self.username ?  btoa(self.username+':'+self.password) : undefined,
        success: function(response) {
          //console.log('loading:', response.length)
          self.saveCache(response, extent, resolution)
          self.handleResponse_(response, projection);
        },
        // Online fail
        error: function(jqXHR, status, error) {
          console.log('error:', status)
          // Try to load an older version
          if (cacheError === 'obsolete') {
            self.loadCache({
              obsolete: true,
              extent: extent, 
              resolution: resolution, 
              // Cache charge
              success: function(response) {
                self.handleResponse_(response, projection);
              },
              error: function() {
                self.handleError_(jqXHR, status, error);
              }
            });
          } else {
            self.handleError_(jqXHR, status, error);
          }
        }
      });
    }
  });
};

/**
 * Set filter
 */
ol_source_Vector_WFS.prototype.setFilter = function (filter) {
  if (this.featureFilter_ !== filter) {
    this.featureFilter_ = filter;
    this.clear();
  }
};

/**
 * Get cache file name
 * @param {ol.extent} extent 
 * @param {Number} resolution 
 */
ol_source_Vector_WFS.prototype.getCacheFileName = function(/*extent, resolution*/) {
  if (this.get('once')) {
    return this.get('cache')+'.cache';
  }
  else return '';
};

/**
 * Load in cache, default no cache
 * @param {} options 
 * 	@param {} options.extent
 * 	@param {} options.resolution
 * 	@param {funcion} options.success success callback
 * 	@param {funcion} options.error error callback
 */
ol_source_Vector_WFS.prototype.loadCache = function(options) {
  options.error('nocache');
};

/**
 * Save cache, default no cache
 * @param {} response something to save
 * @param {} extent
 * @param {} resolution
 */
ol_source_Vector_WFS.prototype.saveCache = function(/*response, extent, resolution*/) {};

/**
 * 
 * @param {*} response 
 * @param {*} projection 
 * @private
 */
ol_source_Vector_WFS.prototype.handleResponse_ = function(response, projection) {
  var data;
  switch (this.get('format')) {
    case 'GeoJSON': {
      data = (new ol_format_GeoJSON()).readFeatures(response);
      break;
    }
    default: {
      data = (new ol_format_WFS()).readFeatures(response);
      break;
    }
  }
  var features = [];
  var hasFeatures = (this.getFeatures().length > 0);
  for (var i=0, f; f=data[i]; i++) {
    var p = f.getGeometry().getFirstCoordinate();
    // BUG
    if (p[0]>=360 || p[0]<=-360) continue;
    f.getGeometry().transform('EPSG:4326', projection);
    if (!hasFeatures || !this.get('id') || !this.hasFeature(f)) {
      features.push(f);
    }
  }
  this.addFeatures(features);
  this.dispatchEvent({ type:"loadend", remains: --this.tileloading_ });
};

/**
 * 
 * @param {*} jqXHR 
 * @param {*} status 
 * @param {*} error 
 * @private
 */
ol_source_Vector_WFS.prototype.handleError_ = function(jqXHR, status, error) {
  if (status !== 'abort') {
    // console.log(jqXHR);
    this.dispatchEvent({ type:"loadend", error:error, status:status, remains:--this.tileloading_ });
  } else {
    this.dispatchEvent({ type:"loadend", remains:--this.tileloading_ });
  }
};

/**
 * Search if feature is allready loaded
 * @param {ol.Feature} feature
 * @return {boolean} 
 */
ol_source_Vector_WFS.prototype.hasFeature = function(feature) {
  var id = feature.get(this.get('id'));
  if (id) {
    var p = feature.getGeometry().getFirstCoordinate();
    var existing = this.getFeaturesInExtent([p[0]-0.1, p[1]-0.1, p[0]+0.1, p[1]+0.1]);
    for (var i=0, f; f=existing[i]; i++) {
      if (id===f.get(this.get('id'))) return true;
    }
    return false;
  } else {
    return false;
  }
};

/**
 * No Feature type
 * @return {any}
 */
ol_source_Vector_WFS.prototype.getFeatureType = function() {
  return this.featureType_ || {};
};

export default ol_source_Vector_WFS
