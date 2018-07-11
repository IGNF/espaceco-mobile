/** ol.source.Vector.WFS
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger loadstart, loadend, overload
 * @param {any}
 * @returns {ol.source.Vector.WFS}
 */
ol.source.Vector.WFS = function(options, cache) 
{   options = options || {};
	
	// Proxy to load features
	this.proxy_ = options.proxy;

	// Authentification
	this.username = options.username;
	this.password = options.password;

	this.featureFilter_ = options.filter || {};
	
	// Strategy for loading source (custom or bbox or tile)
	var strategy = options.strategy;
	if (!strategy && options.minzoom) {
		var tileZoom = options.minzoom+2;
		this.tiled_ = true;
		this._tileGrid = ol.tilegrid.createXYZ({ minZoom: tileZoom, maxZoom: tileZoom, tileSize:options.tileSize||256  }),
		strategy = ol.loadingstrategy.tile (this._tileGrid);
	} else {
		strategy = ol.loadingstrategy.bbox;
	}

	if (this.tiled_) this.maxReload_ = options.maxReload;

	if (cache && cache.loadCache) {
		this.loadCache = cache.loadCache;
	}
	if (cache && cache.saveCache) {
		this.saveCache = cache.saveCache;
	}

	// Inherits
	ol.source.Vector.call(this, {
		// Loader function
		loader: this.loaderFn_,
		// bbox strategy
		strategy: strategy,
		// Features
		features: new ol.Collection(),
		// ol.source.Vector attributes
		attributions: options.attribution,
		useSpatialIndex: true, // force to true for loading strategy tile
		wrapX: options.wrapX
	});

	this.set('url', options.url);
	var cachedir = options.url.replace(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/,"$3").replace(/\./g,'_');
	this.set('cache', cachedir + '/' + options.typename);
	this.set('once', options.once);
	this.set('typename', options.typename);
	this.set('version', options.version);
	this.set('projection', options.srs||'EPSG:4326');
	this.set('id', options.mask.id);
};
ol.inherits(ol.source.Vector.WFS, ol.source.Vector);

/**
 * Loader
 * @private
 */
ol.source.Vector.WFS.prototype.loaderFn_ = function(extent, resolution, projection) {
	// Load once
	if (this._done && this.get('once')) return;
	this._done = true;
	// 
	var self = this;

	// WFS parameters
	extent = ol.proj.transformExtent (extent, projection, this.get('projection'));
	var parameters = {
		service	: 'WFS',
		request: 'GetFeature',
//		outputFormat: 'JSON',
		typeName: this.get('typename'),
//		bbox: extent.join(','),
		boundedBy: extent.join(','),
//		maxFeatures: this.maxFeatures_,
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
			$.ajax({
				url: self.get('url'),
				headers : { "cache-control": "no-cache" },
				cache: false,
				dataType: "text",
				data: parameters,
				// Timout 3mn
				timeout: 3*60*1000,
				// Authentification
				username: self.username||"",
				password: self.password,
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
						this.loadCache({
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
 * Get cache file name
 * @param {ol.extent} extent 
 * @param {Number} resolution 
 */
ol.source.Vector.WFS.prototype.getCacheFileName = function(extent, resolution) {
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
ol.source.Vector.WFS.prototype.loadCache = function(options) {
	console.log(options.extent, options.resolution, this.getProperties());
	options.error('nocache');
};

/**
 * Save cache, default no cache
 * @param {} response something to save
 * @param {} extent
 * @param {} resolution
 */
ol.source.Vector.WFS.prototype.saveCache = function(response, extent, resolution) {};

/**
 * 
 * @param {*} response 
 * @param {*} projection 
 * @private
 */
ol.source.Vector.WFS.prototype.handleResponse_ = function(response, projection) {
	var data = (new ol.format.WFS()).readFeatures(response);
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
ol.source.Vector.WFS.prototype.handleError_ = function(jqXHR, status, error) {
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
ol.source.Vector.WFS.prototype.hasFeature = function(feature) {
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
ol.source.Vector.WFS.prototype.getFeatureType = function() {
	return this.featureType_ || {};
};
