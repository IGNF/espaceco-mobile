/** Control for geolocation
 *
 * @constructor
 * @fire geolocate
 * @extends {ol.control.Toggle}
 * @param {Object=} opt_options Control options.
 *		class {String} class of the control
 */
ol.control.Geolocate = function(options) 
{	var options = options || {};
	var self = this;

	ol.control.Toggle.call(this, 
	{	"class": "ol-geolocate", 
		"html": "<i class='tools-locate'></i>",
		"toggleFn": function()
		{	if (self.geolocation)
			{	var b = !self.geolocation.getTracking();
				self.geolocation.setTracking(b);
			}
		}
	});
}
ol.inherits(ol.control.Geolocate, ol.control.Toggle);

/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.Geolocate.prototype.setMap = function(map) 
{	if (this.geolocation)
	{	this.geolocation.setTracking(false);
	}
	
	ol.control.Toggle.prototype.setMap.call(this, map);

	if (map)
	{	if (!this.geolocation)
		{	this.geolocation = new ol.Geolocation(/** @type {olx.GeolocationOptions} */ 
			({	projection: map.getView().getProjection(),
				trackingOptions: 
				{	maximumAge: 10000,
					enableHighAccuracy: true,
					timeout: 600000
				}
			}));
			this.geolocation.on('change', function(e)
			{	// var prop = this.geolocation.getProperties();
				this.dispatchEvent(
					{	type:'geolocate', 
						position: this.geolocation.getPosition(),
						accuracy: this.geolocation.getAccuracy(),
						// accuracyGeometry: this.geolocation.getAccuracyGeometry(),
						altitude: this.geolocation.getAltitude(),
						altitudeAccuracy: this.geolocation.getAltitudeAccuracy(),
						heading: this.geolocation.getHeading() || 0,
						speed: this.geolocation.getSpeed() || 0
					});
			}, this);
		}
		else
		{	this.geolocation.setProjection(map.getView().getProjection());
		}
	}
};
