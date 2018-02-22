/*
	Copyright IGN (c) 2016 Jean-Marc VIGLINO, 
	Gestion de cache pour des ol.source.Tile 
*/
ol.cache = {};

/**
 * @classdesc 
 *   Abstract base class; normally only used for creating subclasses and not instantiated in apps. 
 *   Used to create cache
 *
 * @constructor
 * @extends {ol.Object}
 * @fires savestart, save, saveend
 * @param {} options extends olx.View.options
 * 	@param {function} options.read function(tile,callback) to read the saved tile
 * 	@param {string} options.authentication: basic authentication as btoa("login:pwd") 
 */
ol.cache.Tile = function (layer, options) 
{	options = options || {};
	
	ol.Object.call(this);

	this.layer = layer;
	this.source = layer.getSource();
	this.tgMinZoom = this.source.getTileGrid().minZoom;
	this.tgMaxZoom = this.source.getTileGrid().maxZoom;

	this.read = options.read;
	this.authentication = options.authentication;

	this.view = new ol.View(options);
	this.baseurl = "";
	this.extent = [];
	this.maxTileLoad = options.maxTileLoas || 20000;
};
ol.inherits(ol.cache.Tile, ol.Object);

/** Read a tile
*	@API 
*/
ol.cache.Tile.prototype.read = function(tile, callback)
{	callback();
}

/** Write a tile
*	@param {string} id id of the tile: zoom-row-col
*	@param {url} url url of the tile to write
*	@API 
*/
ol.cache.Tile.prototype.write = function(id, url)
{	this.dispatchEvent({ type:'save', id:id, url:url });
}

/** Private : getURLSforResolution
*	@param {Array<string>} urls list of url
*	@param {ol.extent} e extent to load
*	@param {integer} r resolution
*/
ol.cache.Tile.prototype.saveResolution = function(e, r)
{	var tl = this.source.getTileGrid().getTileCoordForCoordAndResolution([e[0],e[1]], r);
	var br = this.source.getTileGrid().getTileCoordForCoordAndResolution([e[2],e[3]], r);
	var z = tl[0];
	var r1 = Math.min(tl[1],br[1]);
	var r2 = Math.max(tl[1],br[1]);
	var c1 = Math.min(tl[2],br[2]);
	var c2 = Math.max(tl[2],br[2]);
	var fn = this.source.getTileUrlFunction();
	for (var c=c1; c<=c2; c++)
	{	for (var r=r1; r<=r2; r++)
		{	var url = fn.call(this.source, [z,r,c], this.source.getProjection());
			if (!this.estimate) this.write (z+"-"+c+"-"+r, url);	
			this.length++;
			if (this.estimate && this.length > this.maxTileLoad) break;
		}
		if (this.estimate && this.length > this.maxTileLoad) break;
	}
};

/** Get a list of image url to save in cache
 * @param {Number} minZoom
 * @param {Number} maxZoom
 * @param {ol.extent} extent
 */
ol.cache.Tile.prototype.save = function (minZoom, maxZoom, extent)
{	if (typeof(minZoom)=='undefined') return;
	if (!this.estimate)
	{	this.minZoom = Math.min (minZoom, this.tgMinZoom);
		this.maxZoom = Math.max (maxZoom, this.tgMaxZoom);
		this.extent = extent;
		this.dispatchEvent({ type:'savestart' });
	}

	// Restore original values
	this.source.getTileGrid().minZoom = this.tgMinZoom;
	this.source.getTileGrid().maxZoom = this.tgMaxZoom;
	this.asyncTileLoad();

	// Calculate 
	this.view.setZoom(minZoom);
	// Base url
	var coord = this.source.getTileGrid().getTileCoordForCoordAndResolution(ol.extent.getCenter(extent), this.view.getResolution());
	var fn = this.source.getTileUrlFunction();
	this.baseurl = fn.call(this.source, coord, this.source.getProjection());

	this.length = 0;

	// Get urls
	for (var z=minZoom; z<=maxZoom; z++)
	{	this.view.setZoom(z);
		r = this.view.getResolution();
		this.saveResolution(extent, r);
		if (this.estimate && this.length > this.maxTileLoad) break;
	}
	if (this.estimate && this.length > this.maxTileLoad) {
		this.length = -1;
	}
	
	if (!this.estimate) this.dispatchEvent({ type:'saveend', length: this.length });
};


/** Restore cache to the layer 
*	Cache must have been save before: ie. read can read save cache given an id/url
* @param {Number} minZoom
* @param {Number} maxZoom
* @param {ol.extent} extent
*/
ol.cache.Tile.prototype.restore = function (minZoom, maxZoom, extent)
{	var self = this;
	this.asyncTileLoad(function(tile,callback)
		{	self.read(tile,callback);
		});

	this.layer.setExtent(extent);
//		this.layer.setMinResolution (this.source.getTileGrid().getResolution(zmax+2) || 0);
	this.layer.setMaxResolution (this.source.getTileGrid().getResolution(minZoom-3) || Infinity);
	this.source.getTileGrid().minZoom = minZoom;
	this.source.getTileGrid().maxZoom = maxZoom;

	// Force refresh
	this.source.refresh();
}

/**
 * Load tile asynchronously
 * @param {function} asyncLoadFn function to load tile asynchronously: fn( {id, url}, callback )
 * @api
 */
ol.cache.Tile.prototype.asyncTileLoad = function (asyncLoadFn)
{	// Change tileloadFunction to load async images //this.getTileLoadFunction();
	var _tileLoadFunction = function(imageTile, src) 
	{	imageTile.getImage().src = src;
	};
	var source = this.source;
	// TileLoad
	if (!asyncLoadFn)
	{	source.setTileLoadFunction (_tileLoadFunction);
	}
	else
	{	source.setTileLoadFunction (function(imageTile, src) 
		{	var tilecoord = imageTile.getTileCoord();
			var id = tilecoord[0]+"-"+tilecoord[2]+"-"+tilecoord[1];
			asyncLoadFn({ id:id, url:src }, function(url)
			{	_tileLoadFunction(imageTile, url||src);
				//img.crossOrigin = null;
				//self.changed();
			});
		});
	}
};

/** Get cache extent
*	@return {ol.extent}
*/
ol.cache.Tile.prototype.getExtent = function()
{	return this.extent;
}

/** Get nb tiles in cache
*/
ol.cache.Tile.prototype.getLength = function()
{	return this.length;
};

/** Estimate cache size (Mo)
 * @param {function} callback function({length,size,time}) callback function
 * @param {Number} minZoom
 * @param {Number} maxZoom
 * @param {ol.extent} extent
*/
ol.cache.Tile.prototype.estimateSize = function (callback, minZoom, maxZoom, extent)
{	var tload, minZoom, maxZoom, extent, tgminZoom, tgmaxZoom;
	var nb0 = this.length;
	if (typeof(minZoom)=="number")
	{	this.estimate = true;
		tload = this.source.getTileLoadFunction();
		tgminZoom = this.source.getTileGrid().minZoom;
		tgmaxZoom = this.source.getTileGrid().maxZoom;
		this.save(minZoom, maxZoom, extent);
	}
	var nb = this.length;
	var authentication = this.authentication;
	// Calculate
	if (!nb) 
	{	callback (0); 
	}
	else
	{	try
		{	var time = (new Date()).getTime();
			$.ajax(
			{	//type: 'HEAD',
				url: this.baseurl+"&dtime="+time,
				beforeSend: function(xhr){ 
					if (authentication) {
						xhr.setRequestHeader("Authorization", "Basic " + authentication); 
					}
				},
				success: function(msg, a, xhr)
				{	var s = xhr.getResponseHeader('Content-Length') || xhr.responseText.length;
					callback( 
						{	length: nb, 
							size: Math.round(10*nb*s/1024/1024) /10, 
							time: nb * ((new Date()).getTime()-time)
						});
				},
				error: function()
				{	callback( { length: nb, size: 0 } );
				}
			});
		} catch(e) { callback( { length: nb, size: 0 } ); };
	}
	// Restore values
	if (this.estimate)
	{	this.estimate = false;
		this.length = nb0;
		this.source.setTileLoadFunction (tload);
		this.source.getTileGrid().minZoom = tgminZoom;
		this.source.getTileGrid().maxZoom = tgmaxZoom;
	}
};