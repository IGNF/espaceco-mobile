/** ol.layer.Vector.WFS
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger ready (when source is ready), error (connexion error)
 * @param {} options
 *  @param {function} authentication function to return authentication in a callback
 * @returns {ol.source.Vector.WFS}
 */
ol.layer.Vector.WFS = function(options, cache) {
  if (!options) options = {};
  var self = this;
  var secret = "WFS Espace Collaboratif IGN";

  var cachedir = options.url.replace(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/,"$3").replace(/\./g,'_');
	ol.layer.Vector.call(this,{ 
    title: options.nom,
    //renderMode: "image",
    name: cachedir +':'+ options.typename,
    style: new ol.style.Style.WFS(options.mask.attributes),
    search : options.mask.searchAttribute,
    logo: options.logo
  });

  // Autentication function
  var authenticationFn = options.authentication;

  function createSource() {
    var source = new ol.source.Vector.WFS(options, cache);
    source.featureType_ = {
      attributes: options.mask.attributes
    }
    self.setSource( source );
    setTimeout (function() { self.dispatchEvent({ type:"ready", source: source })}, 100);
    source.on('addfeature', function(e) {
      e.feature._layer = self;
    }, self);
  }

  // Get capabilities
  var getCapabilities = function () {
    $.ajax({
      url: options.url,
      username: options.username, // guichet-ign - guichet_ign$8
      password: options.password ? CryptoJS.AES.decrypt(options.password, secret).toString(CryptoJS.enc.Utf8) : "", 
      timeout: 10000,
      data: {
        service: 'WFS',
        request: 'GetCapabilities'
      },
      // Success: load response
      success: createSource,
      // Error
      error: function(jqXHR, status, error) {
        // Unauthorized
        if (jqXHR.status===401 && typeof(authenticationFn) === 'function') {
          authenticationFn(self, function(login, pwd){
            if (login) {
              options.username = login,
              options.password = CryptoJS.AES.encrypt(pwd, secret).toString();
              // try again
              getCapabilities();
            } else {
              self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
            }
          });
        } else if (cache) {
          switch (jqXHR.status) {
            // Service unavaliable
            case 403:
            case 404:
            case 500:
            case 503:
              self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
              break;
            // Try to load cache anyway
            default:
              // navigator.onLine 
              createSource();
              break;
          }
        } else {
          self.dispatchEvent({ type:"error", error:error, status:jqXHR.status, statusText:status });
        }
      }
    });
  }
  getCapabilities();

  // Zoom level
  var v = new ol.View();
	if (options.maxzoom) {
    v.setZoom(options.maxzoom);
		this.setMinResolution(v.getResolution());
	}
	if (options.minzoom) {
    v.setZoom(options.minzoom);
		this.setMaxResolution(v.getResolution());
  }
};
ol.inherits(ol.layer.Vector.WFS, ol.layer.Vector);


/** FeatureType of the layer
*	@return {featureType} 
*/
ol.layer.Vector.WFS.prototype.getFeatureType = function()
{	if (this.getSource()) return this.getSource().featureType_;
	else return false;
}

/**
 * WFS Style function
 */
ol.style.Style.WFS = function(options) {
	var fill = new ol.style.Fill({
		color: 'rgba(255,255,255,0.4)'
  });
  var stroke = new ol.style.Stroke({
		color: '#3399CC',
		width: 1.25
  });
  var styles = [
    new ol.style.Style({
        image: new ol.style.Circle({
          fill: fill,
          stroke: stroke,
          radius: 5
        }),
        fill: fill,
        stroke: stroke
      })
  ];

  // Look up table for attributes
  var lut = {};
  for (i in options) {
    if (/^symb\@/.test(options[i].title)) lut[options[i].title] = i;
  }
  function attr(name) {
    return lut[name] || name;
  }

  // Style function on feature properties
	return function(feature, resolution) {

    if (feature.wfsStyle) return feature.wfsStyle;
    // Calculate style
    if (feature.get(attr('symb@sColor'))) {
      var pattern = fill;
      var style = {
        pattern: '',
        angle: 0
      }
/**/
      style.pattern = feature.get(attr('symb@fPattern'));
      style.angle = feature.get(attr('symb@pAngle'));
      style.size = feature.get(attr('symb@pWidth'));
      style.spacing = feature.get(attr('symb@pSpace'));

/*/
      var pat = feature.get(attr('symb@fPattern'));
     
      var pat2 = feature.get(attr('symb@pPattern'));
      if (/B1|B2/.test(pat)) {
        var tmp = pat2;
        pat2 = pat;
        pat = tmp;
      }
      switch (pat) {
        case 'B1': 
        case 'B2': 
          break;
        case 'B3': 
          style.pattern = 'hatch';
          style.angle = 90;
          break;
        case 'B4': 
          style.pattern = 'hatch';
          style.angle = 0;
          break;
        case 'B5': 
          style.pattern = 'hatch';
          style.angle = 45;
          break;
        case 'B6': 
          style.pattern = 'hatch';
          style.angle = -45;
          break;
        case 'B7': 
          style.pattern = 'cross';
          break;
        case 'B8': 
          style.pattern = 'square';
          break;
        case 'B16-18': 
          style.pattern = 'dot';
          break;
        case 'fillwave': 
          style.pattern = 'wave';
          break;
        default: ;
          console.log(pat)
          if (ol.style.FillPattern.prototype.patterns[pat]) {
            style.pattern = pat;
            style.angle = feature.get(attr('symb@pAngle'));
            style.size = feature.get(attr('symb@pWidth'));
            style.spacing = feature.get(attr('symb@pSpace'));
          }
          break;
      }
/**/
      if (style.pattern) {
        pattern = new ol.style.FillPattern({
          pattern: style.pattern,
          color: feature.get(attr('symb@pColor')) || 'transparent',
          fill: new ol.style.Fill({
//            color: pat2==='B1' ? 'transparent' : feature.get(attr('symb@fColor')) || 'rgba(255,255,255,0.4)'
            color: feature.get(attr('symb@fColor')) || 'rgba(255,255,255,0.4)'
          }),
          size: style.size || 2,
          spacing: style.spacing || 5,
          angle: style.angle
        });
      } else {
        pattern = new ol.style.Fill({
          color: feature.get(attr('symb@fColor')) || 'rgba(255,255,255,0.4)'
        })
      }
      var text;
      if (feature.get(attr('symb@label'))) {
        text = new ol.style.Text  ({
          text: feature.get(attr('symb@label')),
          stroke: new ol.style.Stroke({ color: feature.get(attr('symb@lColor')) || '#000', width: 4 }),
          fill: new ol.style.Fill ({ color: feature.get(attr('symb@lsColor')) || '#fff' }),
          overflow: false,
          fontSize: feature.get(attr('symb@lSize'))+'px sans-serif' || 10
        });
      }
      var dash = feature.get(attr('symb@sDash')) ? feature.get(attr('symb@sDash')).split(',') : [];
			var style = [
        new ol.style.Style({
          image: new ol.style.Circle({
            fill: fill,
            stroke: stroke,
            radius: 5
          }),
          text: text,
          fill: pattern,
          stroke: new ol.style.Stroke({
            color:  feature.get(attr('symb@sColor')) || '#3399CC',
            width: feature.get(attr('symb@sWidth')) || 1.25,
            lineDash: (dash.length>1 ? dash : undefined)
          })
        })
      ]
      feature.wfsStyle = style;
      return style;
		} else {
			return styles;
		}
	}
}

// BUG
function centerWFS(n) {
  var f = wapp.vector[0].getSource().getFeatures()[n];
  if (!f) return;
  var p = f.getGeometry().getFirstCoordinate()
  wapp.map.getView().setCenter(p)
  console.log(f, wapp.vector[0].getSource().getFeatures().length, p, f.getProperties())
}