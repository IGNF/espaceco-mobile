/** ol.layer.Vector.Webpart
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger ready (when source is ready), error (connexion error)
 * @param {olx.layer.Vector.WebpartOptions} 
 *		- database {string} datatbase name
 *		- name {string} featureType name
 *		- proxy {string|undefined} proxy url
 *		- url {string} service url url
 *		- username {string}
 *		- password {string}
 * @returns {ol.source.Vector.Webpart}
 */
ol.layer.Vector.Webpart  = function(options, source_options) {
	var self = this;
	if (!options) options = {};
	if (!source_options) source_options = {};
	this.url_ = options.url.replace("/wfs","/database/") || "https://espacecollaboratif.ign.fr/gcms/database/"; // Ancien wpart "http://webpart.ign.fr/gcms/database/";
	this.proxy_ = options.proxy;
	this.database_ = options.database;
	this.name_ = options.name;

	if (!source_options.username) source_options.username = options.username;
	if (!source_options.password) source_options.password = options.password;

	options.renderMode = options.renderMode || 'image';
	ol.layer.Vector.call(this, options);
	this.set("name", options.database+":"+options.name);

	if (options.cacheUrl) {
		source_options.cacheUrl = options.cacheUrl;
		this.createSource(options, source_options, options.featureType);
	} else {
		var url = this.url_+this.database_+"/feature-type/"+this.name_+".json";
		$.ajax(
		{	url: (this.proxy_ || url ),
			dataType: 'json', 
			// Authentification
			username: options.username,
			password: options.password,
			data: { url: this.proxy_ ? url : undefined },
			success: function (featureType) {
				self.createSource(options, source_options, featureType);
			},
			error: function(jqXHR, status, error) 
			{	//console.log(jqXHR)
				self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
			}
		});
	}

};
ol.inherits(ol.layer.Vector.Webpart, ol.layer.Vector);

/**
 * Creat the layer source when loaded
 * @param {*} source_options 
 * @param {*} featureType 
 */
ol.layer.Vector.Webpart.prototype.createSource = function(options, source_options, featureType) {
	source_options.proxy = this.proxy_;
	source_options.featureType = featureType;
	// Check for source option
	if (options.checkSourceOptions) options.checkSourceOptions.call(this, source_options, featureType);

	// Webpart source
	var vectorSource = new ol.source.Vector.Webpart(source_options);
	this.setSource(vectorSource);

	// Webpart Layer
	this.set("title", featureType.title);

	// Set zoom level / resolution for the layer
	var v = new ol.View();
	if (featureType.maxZoomLevel && featureType.maxZoomLevel<20) {
		v.setZoom(featureType.maxZoomLevel);
		this.setMinResolution(v.getResolution());
	}
	if (featureType.minZoomLevel || featureType.minZoomLevel===0) {
		v.setZoom(Math.max(featureType.minZoomLevel,4));
		this.setMaxResolution(v.getResolution()+1);
	}
	// Decode condition (parse string)
	if (featureType.style && featureType.style.children) {
		for (var i=0, s; s=featureType.style.children[i]; i++) {
			if (typeof(s.condition)==='string') {
				try { s.condition = JSON.parse(s.condition); }
				catch(e){};
			}
		}
	}

	// Style of the feature style
	if (!options.style && ol.layer.Vector.Webpart.Style) 
	{	this.setStyle (ol.layer.Vector.Webpart.Style.getFeatureStyleFn(featureType));
	}

	this.dispatchEvent({ type:"ready", source: vectorSource });
};

/** Is the layer ready
*	@return {bool} the layer is ready (source is connected)
*/
ol.layer.Vector.Webpart.prototype.isReady = function()
{	return (this.getSource() && this.getSource().featureType_);
}

/** FeatureType of the layer
*	@return {featureType} 
*/
ol.layer.Vector.Webpart.prototype.getFeatureType = function()
{	if (this.isReady()) return this.getSource().featureType_;
	else return false;
}

/** FeatureType style of the layer
*	@return {featureStyle} 
*/
ol.layer.Vector.Webpart.prototype.getFeatureStyle = function()
{	if (this.isReady()) return this.getSource().featureType_.style;
	else return {};
}