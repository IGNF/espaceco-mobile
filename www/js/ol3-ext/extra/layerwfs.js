/** ol.layer.Vector.WFS
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger ready (when source is ready), error (connexion error)
 * @returns {ol.source.Vector.WFS}
 */
ol.layer.Vector.WFS = function(options, authenticationFn) 
{   if (!options) options = {};
	var self = this;

	ol.layer.Vector.call(this,{ 
		title: options.title,
		name: options.nom
	});

	// Get capabilities
	$.ajax({
		url: options.url,
		username: options.username, // 'guichet-ign',
		password: options.password, // 'guichet_ign$8',
		data: {
			service: 'WFS',
			request: 'GetCapabilities'
		},
		success: function(response) {
			var source = new ol.source.Vector.WFS(options);
			self.setSource( new ol.source.Vector.WFS(options) );
			setTimeout (function() { self.dispatchEvent({ type:"ready", source: source })}, 100);
		},
		// Error
		error: function(jqXHR, status, error) 
		{   if (jqXHR.status===401 && typeof(authenticationFn) === 'function') {
				authenticationFn(self, function(login, pwd){
					if (login) {
						options.username = login,
						options.password = pwd;
						var source = new ol.source.Vector.WFS(options);
						self.setSource( new ol.source.Vector.WFS(options) );
						setTimeout (function() { self.dispatchEvent({ type:"ready", source: source })}, 100);
						wapp.ripart.saveParam();
					}
					else {
						self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
					}
				});
			}
			else {
				self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
			}
		}
	});

	// Zoom level
	var v = new ol.View();
	if (options.maxzoom)
	{	v.setZoom(options.maxzoom);
		this.setMinResolution(v.getResolution());
	}
	if (options.minzoom)
	{	v.setZoom(options.minzoom);
		this.setMaxResolution(v.getResolution());
	}
};
ol.inherits(ol.layer.Vector.WFS, ol.layer.Vector);
