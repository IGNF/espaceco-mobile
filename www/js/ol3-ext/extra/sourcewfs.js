/** ol.source.Vector.WFS
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger loadstart, loadend, overload
 * @param {any}
 * @returns {ol.source.Vector.WFS}
 */
ol.source.Vector.WFS = function(options) 
{   options = options || {};
	
	// Proxy to load features
	this.proxy_ = options.proxy;

	// Authentification
	this.username = options.username;
	this.password = options.password;

	this.featureFilter_ = options.filter || {};
	
	// Strategy for loading source (bbox or tile)
	var strategy = options.strategy || ol.loadingstrategy.bbox;
	if (options.minzoom)
	{	var tileZoom = options.minzoom+2;
		this.tiled_ = true;
		var tileGrid = ol.tilegrid.createXYZ({ minZoom: tileZoom, maxZoom: tileZoom, tileSize:options.tileSize||256  }),
		strategy = ol.loadingstrategy.tile (tileGrid);
	}

	if (this.tiled_) this.maxReload_ = options.maxReload;

	ol.source.Vector.call(this, 
		{	// Loader function
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
	this.set('typename', options.typename);
	this.set('version', options.version);
	this.set('projection', options.srs||'EPSG:4326');
	this.set('_id', options.mask.id);
};
ol.inherits(ol.source.Vector.WFS, ol.source.Vector);

/**
 * Loader
 * @private
 */
ol.source.Vector.WFS.prototype.loaderFn_ = function(extent, resolution, projection) {
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
		version: this.get('version'),
	};
	// WFS request
    this.dispatchEvent({type:"loadstart", remains:++this.tileloading_ } );
	
	$.ajax({
		url: this.get('url'),
		data: parameters,
		// Authentification
		username: this.username,
		password: this.password,
		success: function(response) {
			var data = (new ol.format.WFS()).readFeatures(response);
			var features = []
			for (var i=0, f; f=data[i]; i++) {
				f.getGeometry().transform('EPSG:4326', projection);
				if (!self.hasFeature(f)) {
					features.push(f);
				}
			}
			self.addFeatures(features);
			self.dispatchEvent({ type:"loadend", remains: --self.tileloading_ });
//			if (data.length == self.maxFeatures_) self.dispatchEvent({ type:"overload" });
		},
		// Error
		error: function(jqXHR, status, error) 
		{   if (status !== 'abort') 
			{	// console.log(jqXHR);
				self.dispatchEvent({ type:"loadend", error:error, status:status, remains:--self.tileloading_ });
			}
			else 
			{	self.dispatchEvent({ type:"loadend", remains:--self.tileloading_ });
			}
		}
	});
};

/**
 * Search if feature is allready loaded
 * @param {ol.Feature} feature
 * @return {boolean} 
 */
ol.source.Vector.WFS.prototype.hasFeature = function(feature) {
	var p = feature.getGeometry().getFirstCoordinate();
	var id = feature.get(this.get('id'));
	var existing = this.getFeaturesInExtent([p[0]-0.1, p[1]-0.1, p[0]+0.1, p[1]+0.1]);
	for (var i=0, f; f=existing[i]; i++) {
		if (id===f.get(this.get('id'))) return true;
	}
	return false;
};

/**
 * No Feature type
 * @return {any}
 */
ol.source.Vector.WFS.prototype.getFeatureType = function() {
	return {};
};
