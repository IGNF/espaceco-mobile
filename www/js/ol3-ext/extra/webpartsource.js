/** Need proj4js to load projections
*/
if (!proj4) throw ("PROJ4 is not defined!");

/* Define projections
*/
if (!proj4.defs["EPSG:2154"]) proj4.defs("EPSG:2154","+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
if (!proj4.defs["IGNF:LAMB93"]) proj4.defs("IGNF:LAMB93","+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
if (!proj4.defs["EPSG:27572"]) proj4.defs("EPSG:27572","+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs");
if (!proj4.defs["EPSG:2975"]) proj4.defs("EPSG:2975","+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
// Saint-Pierre et Miquelon
if (!proj4.defs["EPSG:4467"]) proj4.defs("EPSG:4467","+proj=utm +zone=21 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
// Antilles
if (!proj4.defs["EPSG:4559"]) proj4.defs("EPSG:4559","+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

/** ol.source.Vector.Webpart
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger savestart, saveend, loadstart, loadend, overload
 * @param {olx.source.WebpartOptions}
 *		- proxy {string} proxy path, default none
 *		- username {string} authentification
 *		- password {string} authentification
 *		- maxFeatures {integer} max number of feature to load before overload, default 5000
 *		- maxReload {integer} max number of feature before reload (for tiled layers), default +Infinity
 *		- featureType {featureType} 
 *		- filter {Object} Webpart filter, ie: {detruit:false}, default {}
 *		- tileZoom {integer} tile zoom for tiled layers (tile size are requested at tileZoom)
 *		- tileSize {integer|undefined} size for tiles, default 256
 *		- preserved {ol.Collection} collection of objects to preserve when reload
 *		- attribution {ol.Attribution} source attribution
 *		- wrapX {bool}
 * @returns {ol.source.Vector.Webpart}
 */
ol.source.Vector.Webpart = function(opt_options) 
{   var options = opt_options || {};
	
	// Proxy to load features
	this.proxy_ = options.proxy;

	// Authentification
	this.username = options.username;
	this.password = options.password;

    // Source is loading
	this.tileloading_	= 0;
    this.isloading_     = false;
	if (options.featureType === undefined) {
		throw 'featureType must be defined.';
	}
	this.featureType_ 	= options.featureType;

	// Document uri
    this.featureType_.docURI = this.featureType_.wfs.replace(/\/gcms\/.*/,"/document/");
	// Url pour les transactions
    this.featureType_.wfstransaction = this.featureType_.wfs.replace(/\/wfs\/.*/,"/wfstransactions/");

	this.maxFeatures_	= options.maxFeatures || 5000;
	
	var crs = this.featureType_.attributes[this.featureType_.geometryName];
	crs = crs ? crs.crs : 'IGNF:LAMB93';
	this.srsName_  = crs || 'IGNF:LAMB93'; // 'EPSG:4326';

	if (!proj4.defs[this.srsName_]) {
		console.error('PROJECTION INCONNUE', this.srsName_);
	}
				
	this.featureFilter_ = options.filter || {};
	
	// Strategy for loading source (bbox or tile)
	var strategy = options.strategy || ol.loadingstrategy.bbox;
	if (options.tileZoom)
	{	this.tiled_ = true;
		this._tileGrid = ol.tilegrid.createXYZ({ minZoom: options.tileZoom, maxZoom: options.tileZoom, tileSize:options.tileSize||256  }),
		strategy = ol.loadingstrategy.tile (this._tileGrid);
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
			logo: options.logo,
			useSpatialIndex: true, // force to true for loading strategy tile
			wrapX: options.wrapX
    	});
    
    // Collection of feature we want to preserve when reloaded
	this.preserved_ = options.preserved || new ol.Collection();
    // Inserted features
    this.insert_ = [];
    this.on ('addfeature', this.onAddFeature_, this);
	// Deleted features
    this.delete_ = [];
    this.on ('removefeature', this.onDeleteFeature_, this);
	// Modified features
    this.update_ = [];
    this.on ('changefeature', this.onUpdateFeature_, this);
};
ol.inherits(ol.source.Vector.Webpart, ol.source.Vector);


/** Editing states for vector features
*/
ol.Feature.State = {
    UNKNOWN: 'Unknown',
    INSERT: 'Insert',
    UPDATE: 'Update',
    DELETE: 'Delete'
};

/** Get feature state
* @return { ol.Feature.State }
*/
ol.Feature.prototype.getState = function()
{	return this.state_ || ol.Feature.State.UNKNOWN;
}

/** Set feature state
* @param { ol.Feature.State }
*/
ol.Feature.prototype.setState = function(state)
{	this.state_ = state;
}

/** Get layer's tile grid
* @return { ol.tilegrid.TileGrid }
*/
ol.source.Vector.Webpart.prototype.getTileGrid = function()
{	return this._tileGrid;
}

/** Get the layer featureType
* @return { featureType }
*/
ol.source.Vector.Webpart.prototype.getFeatureType = function()
{	return this.featureType_;
}

/** Reset edition 
*/
ol.source.Vector.Webpart.prototype.reset = function()
{	this.insert_ = [];
	this.delete_ = [];
	this.update_ = [];
	this.preserved_.clear();
	this.reload();
}

/** Force source reload
* @warning use this function instead of clear() to avoid delete events on reload
*/
ol.source.Vector.Webpart.prototype.reload = function()
{	this.isloading_ = true;
    this.un ('removefeature', this.onDeleteFeature_, this);
	// Clear without event ???
	// this.getFeaturesCollection().clear(true);
	// Send event clear
	this.clear(true);
    this.on ('removefeature', this.onDeleteFeature_, this);
	this.isloading_ = false;
	console.log('reload')
	this.dispatchEvent({ type:"reload", maxreload: this.maxReload_ });
}

/** Get save actions
* @return list of save actions + number of features in each states
*/
ol.source.Vector.Webpart.prototype.getSaveActions = function()
{	var self = this;
	var idName = this.featureType_.idName;
	var geometryAttribute = this.featureType_.geometryName;
	var typeName = this.featureType_.name;
	var actions = [];
	var wkt = new ol.format.WKT();

	function getActions (t, state)
	{	nb=0;
		for (var i=0; i<t.length; i++)
		{	var f = t[i];
			if (f.getState() == state)
			{	var a = { feature: f.getProperties(), state: f.getState(), typeName: typeName };
				var g = a.feature.geometry.clone();
				g.transform (self.projection_, self.srsName_);
				delete a.feature.geometry;
				// delete a.feature._id;
				a.feature[geometryAttribute] = wkt.writeGeometry(g);
				actions.push(a);
				nb++;
			}
		}
		return nb;
	}

	var res = {};
	res.actions = actions;
	// Insert
	res[ol.Feature.State.INSERT] = getActions (this.insert_, ol.Feature.State.INSERT);
	// Delete
	res[ol.Feature.State.DELETE] = getActions (this.delete_, ol.Feature.State.DELETE);
	// Update
	res[ol.Feature.State.UPDATE] = getActions (this.update_, ol.Feature.State.UPDATE);

	return res;
}

/** Save changes
*/
ol.source.Vector.Webpart.prototype.save = function()
{	var self = this;
	var actions = this.getSaveActions().actions;
	
	self.dispatchEvent({ type:"savestart" });
	// Noting to save
	if (!actions.length) 
	{	self.dispatchEvent({ type:"saveend" });
		return;
	}

	// Post changes
	var param = 
	{	"actions": JSON.stringify(actions), 
		"databases": '{"'+this.featureType_.database+'":["'+this.featureType_.name+'"]}',
		"typeName": this.featureType_.name,
		"url": this.featureType_.wfs+"transaction/"	
	};
	var url = this.featureType_.wfstransaction;
	
	if (this.proxy_) param.url = url;
	$.ajax(
		{	url: this.proxy_ || url,
			method: 'POST',
			data: param,
	
			// Authentification
			username: this.username_,
			password: this.password_,

			success: function(data) 
			{	if (data == "success")
				{	// Clear history
					self.reset();
					self.dispatchEvent({ type:"saveend" });
				}
				else self.dispatchEvent({ type:"saveend", error: data });
			},
			error: function(jqXHR, status, error)
			{	console.log(error)
				self.dispatchEvent({ type:"saveend", status:status, error:error });
			}
		});
}

/**
 * Triggered when a feature is added / update add actions
 * @param {type} e
 */
ol.source.Vector.Webpart.prototype.onAddFeature_ = function(e)
{   if (this.isloading_) return;
	var f = e.feature;
    f.setState(ol.Feature.State.INSERT);
	// Add attributes according to featureType
	var atts = this.getFeatureType().attributes;
	var gname= this.getFeatureType().geometryName;
	for (var i in atts) if (i!=gname)
	{	if (!f.get(i)) f.set(i,null);
	}
    this.insert_.push(e.feature);
};

/*
 * Triggered when a feature is removed / update remove actions
 * @param {type} e
 */
ol.source.Vector.Webpart.prototype.onDeleteFeature_ = function(e)
{   if (this.isloading_) return;
	
	function removeFeature(features, f) 
	{	for (var i=0, l=features.length; i<l; i++) 
		{	if (features[i] === f) 
			{	features = features.splice(i, 1);
				return;
			}
		}
	}

	switch (e.feature.getState())
	{	case ol.Feature.State.INSERT:
			removeFeature (this.insert_, e.feature);
			break;
		case ol.Feature.State.UPDATE:
			removeFeature (this.update_, e.feature);
		default:
			this.delete_.push(e.feature);
			break;
	}
    e.feature.setState(ol.Feature.State.DELETE);
};

/**
 * Triggered when a feature is updated / update update actions
 * @param {type} e
 */
ol.source.Vector.Webpart.prototype.onUpdateFeature_ = function(e)
{   if (this.isloading_) return;
    
    // if feature has already a state attribute (INSERT),
    // we don't need to add it in this.update_
    if (e.feature.getState() != ol.Feature.State.UNKNOWN) return;
    
    e.feature.setState(ol.Feature.State.UPDATE);
    this.update_.push(e.feature);
};

/** Find a feature giving a fid
*	@param {string} fid
*	@param {Array<ol.feature>} an array to search in
*	@return {ol.feature|null}
*/
ol.source.Vector.Webpart.prototype.findFeatureByFid = function(fid, features) 
{	var idName = this.featureType_.idName;
	var l = features.length;
	for (var i=0; i<l; i++)
	{   if (features[i].get(idName)===fid) 
		{	return features[i];
		}
	}
	return null;
}

/** Find preserved feature (updated, deleted or preserved)
* @param {ol.Feature}
* @private
*/
ol.source.Vector.Webpart.prototype.findFeature_ = function(f) 
{   var idName = this.featureType_.idName;
	var fid = f.get(idName);

	// Find feature in table
	function find(features)
	{	var l = features.length;
		for (var i=0; i<l; i++)
		{   if (features[i].get(idName)===fid) 
			{	f = features[i];
				return true;
			}
		}
		return false;
	}
    
	// Allready loaded (features on tile edges)
	if (this.tiled_)
	{	var p = f.getGeometry().getFirstCoordinate();
		if (find(this.getFeaturesInExtent([p[0]-0.1, p[1]-0.1, p[0]+0.1, p[1]+0.1])))
		{	return null;
		}
		return f;
	}
	// Search deleted feature
	if (find(this.delete_)) return null;
	// Search updated features
	if (find(this.update_)) return f;
	// Search preserved features
	if (find(this.preserved_.getArray())) return f;
	// Nothing found > return initial feature
    return f;
};


/**
 * Parametres du WFS
 * @param {ol.extent} extent
 * @param {ol.projection} projection
 */
ol.source.Vector.Webpart.prototype.getWFSParam = function (extent, projection) {
	var bbox = ol.proj.transformExtent(extent, projection, this.srsName_);
    var bboxStr = bbox.join(',');

	// WFS parameters
	var parameters = {
		service	: 'WFS',
		request: 'GetFeature',
		outputFormat: 'JSON',
		typeName: this.featureType_.name,
		bbox: bboxStr,
		filter: JSON.stringify(this.featureFilter_),
		maxFeatures: this.maxFeatures_,
		version: '1.1.0'
	};
	if (this.proxy_) parameters.url = this.featureType_.wfs;
	return parameters;
};

/**
 * The loader function used to load features
 * @private
 */
ol.source.Vector.Webpart.prototype.loaderFn_ = function (extent, resolution, projection) {
	// if (resolution > this.maxResolution_) return;
	var self = this;

	// Save projection for writing
	this.projection_ = projection;

	// TODO self.srsName_
	if (!proj4.defs[this.srsName_]) {
		return;
	}

	// WFS parameters
	var parameters = this.getWFSParam(extent, projection);

	// Abort existing request
    if (this.request_ && !this.tiled_) this.request_.abort();
	
    this.dispatchEvent({type:"loadstart", remains:++this.tileloading_ } );

	// Reload all if maxFeatures
	if (this.maxReload_ && this.tileloading_==1 && this.getFeatures().length > this.maxReload_)
	{	// console.log('clear: '+this.getFeatures().length)
		this.reload();
	}

	// Ajax request to get features in bbox
	this.request_ = $.ajax(
	{	url: this.proxy_ || this.featureType_.wfs,
		dataType: 'json', 
		data: parameters,
		success: function(data) 
		{   var feature, features = [];
            var geometryAttribute = self.featureType_.geometryName;
            var format = new ol.format.WKT();
			var r3d = /([-+]?(\d*[.])?\d+) ([-+]?(\d*[.])?\d+) ([-+]?(\d*[.])?\d+)/g;
			//
            for (var f=0; f<data.length; f++) 
			{	var geom = data[f][geometryAttribute];
				// 
				if (geom.type)
				{	var g = new ol.geom[geom.type] (geom.coordinates);
					g.transform (self.srsName_, projection);
					feature = new ol.Feature (g);
				}
				// WKT
				else
				{   geom = geom.replace (r3d, "$1 $3");
					feature = format.readFeature(geom, 
						{   dataProjection: self.srsName_,
							featureProjection : projection
						});
				}
               
                var properties = data[f];
                delete properties[geometryAttribute];
                feature.setProperties(properties, true);

				// Find preserved features
                feature = self.findFeature_(feature);
                if (feature) 
				{	features.push( feature );
				}
            }
            
            // Add new inserted features
            var l = self.insert_.length;
            for (var i=0; i<l; i++) 
			{   if (self.insert_[i].getState()===ol.Feature.State.INSERT) features.push( self.insert_[i] );
            }

            // Start replacing features
            self.isloading_ = true;
			if (!self.tiled_) self.getFeaturesCollection().clear();
			if (features.length) self.addFeatures(features);
            self.isloading_ = false;
			self.dispatchEvent({ type:"loadend", remains: --self.tileloading_ });
			if (data.length == self.maxFeatures_) self.dispatchEvent({ type:"overload" });
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

/** Gestion des documents
*	@param {number} document ID
*	@return {url} 
*/
ol.source.Vector.Webpart.prototype.getDocumentUrl = function (id) 
{	return this.featureType_.docURI+"download/"+id;
}


/** Gestion des documents
*	@param {number} document ID
*	@param {function} callback
*/
ol.source.Vector.Webpart.prototype.getDocument = function (id, cback)
{   if (!id) { cback(); }
    
    $.ajax(
	{   url: this.featureType_.docURI+"get/"+id,
        type: "GET",
        async: false,
        data: null,
		success: function(results)
		{   if (!cback) return;
			if (results.status == 'OK') cback (JSON.parse(results.document));
			else cback(results);
		},
		error: function (xhr, status, error)
		{	if (cback) cback ({ status:status, error:error });
		}
	});
}


/** Gestion des documents
*	@param {file|jQueryInputFile}
*	@param {function} callback
*/
ol.source.Vector.Webpart.prototype.addDocument = function (file, cback) 
{	if (file instanceof jQuery) file = $(elt).prop('files')[0];	
    var data = new FormData();
    data.append('fileToUpload', file);
    $.ajax(
	{	url: this.featureType_.docURI+"add",
		type: "POST",
		data: data,
		processData: false,  // jQuery don't process data
		contentType: false,   // don't send contentType
		success: function(results)
		{	if (cback) cback (results);
		},
		error: function (xhr, status, error)
		{	if (cback) cback ({ status:status, error:error });
		}
	});
}

/** Gestion des documents
*	@param {number} document id
*	@param {function} callback
*/
ol.source.Vector.Webpart.prototype.deleteDocument = function (id, cback)
{	$.ajax(
	{	url: this.featureType_.docURI+"delete/"+id,
		success: function(results)
		{   if (cback) cback (results);
		},
		error: function (xhr, status, error)
		{	if (cback) cback ({ status:status, error:error });
		}
	});
}