import * as CryptoJS from 'crypto-js';
import ol_layer_Vector from 'ol/layer/Vector'
import ol_View from 'ol/View'
import { ol_ext_inherits } from 'ol-ext/util/ext'

import ol_style_Style from 'ol/style/Style'
import ol_style_Fill from 'ol/style/Fill'
import ol_style_Stroke from 'ol/style/Stroke'
import ol_style_Circle from 'ol/style/Circle'
import ol_style_Text from 'ol/style/Text'
import ol_style_FillPattern from 'ol-ext/style/FillPattern'

import { asArray as ol_color_asArray } from 'ol/color'

import ol_source_Vector_WFS from '../source/WFS'

/** ol_layer_Vector_WFS
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger ready (when source is ready), error (connexion error)
 * @param {} options
 *  @param {function} authentication function to return authentication in a callback
 * @returns {ol.source.Vector.WFS}
 */
const ol_layer_Vector_WFS = function(options, cache) {
  if (!options) options = {};
  if (!options.mask) options.mask = {};
  // ** OLD VERSION
  if (options.minzoom || options.maxzoom) console.error('[ol_layer_Vector_WFS] Use minZoom or maxZoom')
  // **
  var self = this;
  var secret = "WFS Espace Collaboratif IGN";

  this.crypt = function(pwd) {
    return CryptoJS.AES.encrypt(pwd, secret).toString();
  };

  if (!options.url) return;
  
  var cachedir = options.url.replace(/^((http[s]?|ftp):\/)?\/?([^:/\s]+)((\/\w+)*\/)([\w\-.]+[^#?\s]+)(.*)?(#[\w-]+)?$/,"$3").replace(/\./g,'_');
	ol_layer_Vector.call(this, { 
    title: options.title,
    description: options.description,
    visible: options.visible,
    opacity: options.opacity,
    //renderMode: "image",
    name: cachedir +':'+ options.typename,
    style: options.style || new ol_style_Style_WFS(options.mask.attributes),
    search : options.mask.searchAttribute,
    logo: options.logo
  });

  // Autentication function
  var authenticationFn = options.authentication;

  function createSource() {
    var source = new ol_source_Vector_WFS(options, cache);
    source.featureType_ = {
      attributes: options.mask.attributes
    }
    self.setSource( source );
    setTimeout (function() { self.dispatchEvent({ type:"ready", source: source })}, 100);
    source.on('addfeature', function(e) {
      e.feature._layer = self;
    }.bind(self));
  }

  // Get capabilities
  this.set('authentication', options.username);
  if (options.getCapabilities !== false) {
    var getCapabilities = function () {
      $.ajax({
        url: options.url,
        username: options.username, // G.Site - gestion10
        password: options.password ? CryptoJS.AES.decrypt(options.password, secret).toString(CryptoJS.enc.Utf8) : undefined, 
        timeout: 10000,
        data: {
          service: 'WFS',
          request: 'GetCapabilities'
        },
        // Success: load response
        success: createSource,
        // Error
        error: function(jqXHR, status, error) {
          console.log(jqXHR.status)
          // Unauthorized
          if (((jqXHR.status===0 && !options.username) || jqXHR.status===401 || jqXHR.status===500) && typeof(authenticationFn) === 'function') {
            authenticationFn(self, function(login, pwd){
              if (login) {
                options.username = login;
                self.set('authentication', options.username);
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
  } else {
    createSource();
  }

  // Zoom level
  var v = new ol_View();
	if (options.maxZoom && options.maxZoom<20) {
    v.setZoom(options.maxZoom);
		this.setMinResolution(v.getResolution());
	}
	if (options.minZoom) {
    v.setZoom(options.minZoom);
		this.setMaxResolution(v.getResolution());
  }
};
ol_ext_inherits(ol_layer_Vector_WFS, ol_layer_Vector);

/** FeatureType of the layer
*	@return {featureType} 
*/
ol_layer_Vector_WFS.prototype.getFeatureType = function()
{	if (this.getSource()) return this.getSource().featureType_;
	else return false;
}

/**
 * WFS Style function
 */
const ol_style_Style_WFS = function(options) {
	var fill = new ol_style_Fill({
		color: 'rgba(255,255,255,0.4)'
  });
  var stroke = new ol_style_Stroke({
		color: '#3399CC',
		width: 1.25
  });
  var defaultStyles = [
    new ol_style_Style({
        image: new ol_style_Circle({
          fill: fill,
          stroke: stroke,
          radius: 5
        }),
        fill: fill,
        stroke: stroke
      })
  ];

  // Look up table for attributes
  const lut = {};
  for (let i in options) {
    if (/^symb@/.test(options[i].title)) lut[options[i].title] = i;
  }
  function attr(name) {
    return lut[name] || name;
  }

  // Style function on feature properties
	return function(feature) {
    // Allready defined
    if (feature.wfsStyle) return feature.wfsStyle;
    // Calculate style
    if (feature.get(attr('symb@sColor'))) {
      var pattern = fill;
      const style = {
        pattern: '',
        angle: 0
      }
      style.pattern = feature.get(attr('symb@fPattern'));
      style.angle = feature.get(attr('symb@pAngle'));
      style.size = feature.get(attr('symb@pWidth'));
      style.spacing = feature.get(attr('symb@pSpace'));

      var fillColor = ol_color_asArray(feature.get(attr('symb@fColor'))) || 'rgba(255,255,255,0.4)';
      if (style.pattern) {
        pattern = new ol_style_FillPattern({
          pattern: style.pattern,
          color: feature.get(attr('symb@pColor')) || 'transparent',
          fill: new ol_style_Fill({
//            color: pat2==='B1' ? 'transparent' : feature.get(attr('symb@fColor')) || 'rgba(255,255,255,0.4)'
            color: fillColor
          }),
          size: style.size || 2,
          spacing: style.spacing || 5,
          angle: style.angle
        });
      } else {
        pattern = new ol_style_Fill({
          color: fillColor
        })
      }
      var text;
      if (feature.get(attr('symb@label'))) {
        text = new ol_style_Text  ({
          text: feature.get(attr('symb@label')),
          stroke: new ol_style_Stroke({ color: feature.get(attr('symb@lColor')) || '#000', width: 4 }),
          fill: new ol_style_Fill ({ color: feature.get(attr('symb@lsColor')) || '#fff' }),
          overflow: false,
          fontSize: feature.get(attr('symb@lSize'))+'px sans-serif' || 10
        });
      }
      var dash = feature.get(attr('symb@sDash')) ? feature.get(attr('symb@sDash')).split(',') : [];
			const wfstyle = [
        new ol_style_Style({
          image: new ol_style_Circle({
            fill: fill,
            stroke: stroke,
            radius: 5
          }),
          text: text,
          fill: pattern,
          stroke: new ol_style_Stroke({
            color:  feature.get(attr('symb@sColor')) || '#3399CC',
            width: feature.get(attr('symb@sWidth')) || 1.25,
            lineDash: (dash.length>1 ? dash : undefined)
          })
        })
      ]
      feature.wfsStyle = wfstyle;
      return wfstyle;
		} else {
			return defaultStyles;
		}
	}
}
/* */ 

export default ol_layer_Vector_WFS
