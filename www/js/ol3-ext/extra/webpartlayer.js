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
ol.layer.Vector.Webpart  = function(options, source_options) 
{   var self = this;
	if (!options) options = {};
	if (!source_options) source_options = {};
	
	this.url_ = options.url || "https://espacecollaboratif.ign.fr/gcms/database/"; // Ancien wpart "http://webpart.ign.fr/gcms/database/";
	this.proxy_ = options.proxy;
	this.database_ = options.database;
	this.name_ = options.name;
	
	if (!source_options.username) source_options.username = options.username;
	if (!source_options.password) source_options.password = options.password;

	var url = this.url_+this.database_+"/feature-type/"+this.name_+".json";
	$.ajax(
	{	url: (this.proxy_ || url ),
		dataType: 'json', 
		// Authentification
		username: options.username,
		password: options.password,

		data: { url: this.proxy_ ? url : undefined },
		success: function (featureType) 
		{	source_options.proxy = self.proxy_;
			source_options.featureType = featureType;
			// Webpart source
			vectorSource = new ol.source.Vector.Webpart(source_options);

			self.setSource(vectorSource);
			self.dispatchEvent({ type:"ready", source: vectorSource });

			// Style of the feature style
			if (!options.style && ol.layer.Vector.Webpart.Style) self.setStyle (ol.layer.Vector.Webpart.Style.getFeatureStyleFn(featureType));
		},
		error: function(jqXHR, status, error) 
		{	//console.log(jqXHR)
			self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
        }
	});

	ol.layer.Vector.call(this, options);
};
ol.inherits(ol.layer.Vector.Webpart, ol.layer.Vector);

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