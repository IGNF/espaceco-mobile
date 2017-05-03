/*  __  __                      _    _        _   
   |  \/  |___ _ _    __ _ _  _(_)__| |_  ___| |_ 
   | |\/| / _ \ ' \  / _` | || | / _| ' \/ -_)  _|
   |_|  |_\___/_||_| \__, |\_,_|_\__|_||_\___|\__|
                     |___/                        
*/
/** Web application geodesique
 * @type {CordovApp}
 * 
 */
var wapp = new CordovApp(
{	/**
	* Initilize the application map 
	* @method
	*/
	initialize: function() 
	{	var self = this; 
		// Version => cordova-plugin-app-version ???
		$(".version").text(this.version);

		// Gestion de l'aide en ligne
		$("#help").click(wapp.help.hide);

		// Polyfill bug webkitCancelRequestAnimationFrame an android < 4.2
		if (!window.cancelAnimationFrame && window.webkitCancelRequestAnimationFrame)
		{	window.cancelAnimationFrame = window.webkitCancelRequestAnimationFrame;
		}

		// Lancement
		wapp.wait("Chargement...", false);

		// url du service => chercher sur internet
		geoportailConfig.url = "http://wxs.ign.fr/";

		// Gestion des parametres
		if (!this.param.options) this.param.options={};
		this.paramInput = this.setParamInput("#options", this.param.options, function(e)
			{	switch (e.name)
				{	case "rotmap":
						wapp.rotateMap(e.val);
						break;
					case "zoombt":
						if (e.val===false) $("#map .ol-zoom").hide();
						else $("#map .ol-zoom").show();
						break;
					case "searchbt":
						if (e.val===false) $("#map .searchCtrl").hide();
						else $("#map .searchCtrl").show();
						break;
					case "qlf":
						if (wapp.ripart)
						{	var qlf = /qlf/.test(wapp.ripart.getServiceUrl());
							if (e.val!=qlf) 
							{	if (e.val)wapp.ripart.setServiceUrl("https://qlf-collaboratif.ign.fr/collaboratif-develop/api/");
								else wapp.ripart.setServiceUrl("https://espacecollaboratif.ign.fr/api/");
								wapp.ripart.deconnect();
							}
						}
						break;
					default: break;
				}
			});

		// Gestion des parametres caches
		var cheat = 0;
		var tcheat = new Date();
		$('#options [data-role="header"]').on("click touchstart", function(e)
		{	e.stopPropagation();
			e.preventDefault();
			var t = new Date();
			if (t-tcheat > 250) cheat = 0;
			else cheat++;
			tcheat = t;
			if (cheat>10 || wapp.param.options.qlf)
			{	wapp.notification ("Mode debug activé...",500);
				cheat=0;
				$(".debug").show();
			}
		});
		if (this.param.options.qlf) $(".debug").show();

		// Layers (set hdpi:false to enable tile cache)
		var layers = this.layers =  [
				// Fonds de plan
				new ol.layer.Group(
				{	name:"Fond de plan",
					layers:
					[	new ol.layer.Geoportail("GEOGRAPHICALGRIDSYSTEMS.MAPS", {baseLayer: true, hidpi: false, visible: true }),
						new	ol.layer.Geoportail("GEOGRAPHICALGRIDSYSTEMS.PLANIGN", {baseLayer: true, hidpi: false, visible: false }),
						new	ol.layer.Geoportail("ORTHOIMAGERY.ORTHOPHOTOS", {baseLayer: true, hidpi: false, visible: false })
					]
				}),
				// Layer pour l'affichage du cache
				new ol.layer.Group({ title:"Mes cartes", name: "cache", displayInLayerSwitcher: false }),
				// Overlays
				new ol.layer.Geoportail("BUILDINGS.BUILDINGS", { hidpi: false, visible: false }),
				new ol.layer.Geoportail("CADASTRALPARCELS.PARCELS", { hidpi: false, visible: false }),
				new ol.layer.Geoportail("TRANSPORTNETWORKS.ROADS", { hidpi: false, visible: false }),
				// Couche INSPIRE adresse
				new ol.layer.Tile ({
					"name": "Adresses",
					"extent": [ -7030196.346030043, -2438399.008686918, 6215711.586687296, 6645292.597727471 ],
					"minResolution": 0,
					"maxResolution": 4,
					"visible": false,
					"source": new ol.source.TileWMS(
					{	"url": "http://wxs.ign.fr/"+apiKey+"/inspire/v/wms",
						"projection": "EPSG:3857",
						"crossOrigin": "anonymous",
						"params": {
							"LAYERS": "AD.Address",
							"FORMAT": "image/png",
							"VERSION": "1.3.0"
						}
					})
				})
			];

		// The map
		var pos = this.param.position || {};
		var map = this.map = new ol.Map.Geoportail
			({	target: 'map',
				key: apiKey,
				// Improve user experience by loading tiles while animating. Will make
				// animations stutter on mobile or slow devices.
				//loadTilesWhileAnimating: true,
				view: new ol.View
				({	zoom: pos.zoom || 5,
					center: [pos.lon || 166326, pos.lat || 5992663]
				}),
				controls: ol.control.defaults({ attribution:false }),
				interactions: ol.interaction.defaults(),
				layers: layers
			});
		if (map.getView().getZoom()>18) map.getView().setZoom(18);

		// Prevent link to open 
		ol.Attribution.uniqueAttributionKey = {};
		map.formatAttribution = function()
		{	var a = ol.Map.Geoportail.prototype.formatAttribution.apply (map, arguments);
			return a.replace("<a href","<span data-href").replace("</a>","</span>");
		};

		// Centrer la carte
		function centerMap(pos)
		{	map.getView().setCenter(pos);
			if (map.getView().getZoom()<15) map.getView().setZoom(15);
			map.pulse(pos);
		};

		// Geolocation Control
		//this.addLocateControl(map);
		var locCtrl = new ol.control.GeoportailLocate(
			{	apiKey:apiKey, 
				target: $('#search [data-role="content"]').get(0),
				onGeocode: function(pos, r)
				{	centerMap(ol.proj.transform(pos,'EPSG:4326', map.getView().getProjection()));
					wapp.hidePage();
				}
			});
		map.addControl (locCtrl);
		// Search button
		var searchCtrl = new ol.control.Button(
			{	className: "searchCtrl",
				html: "<i class='fa fa-search'></i>",
				handleClick: function()
				{	wapp.showPage('search');
				}
			});
		map.addControl (searchCtrl);

		// Scale line
		map.addControl (new ol.control.CanvasScaleLine());

		// Disable control
		this.disableCtrl = new ol.control.Disable();
		map.addControl (this.disableCtrl);

		// Attribution
		// map.setAttributionsMode("logo")
		map.addControl (new ol.control.Attribution({ collapsible:false }));

		// Menu
		map.addControl (new ol.control.Toggle(
		{	"className": "menuCtrl", 
			"html": "<i class='fa fa-bars'></i>",
			"toggleFn": function(b)
			{	wapp.toggleMenu();
			}
		}));

		// Layer switcher
		map.addControl (new ol.control.LayerSwitcher({ target:$("#layerswitcher").get(0), extent:true, reordering: false }));

		// Geolocation Control
		var geoloc = window.geoloc = new ol.control.Geolocate();
		geoloc.on("geolocate", function(e) 
			{	centerMap(e.position);
			});
		map.addControl(geoloc);

		// Selection
		var selPoint = new ol.style.Style (
			{	image: new ol.style.Circle(
				{	stroke: new ol.style.Stroke({color: '#f00', width: 4}),
					radius: 20
				}),
			});
		var selStroke = new ol.style.Stroke({color: '#f00', width: 3 });
		var selLayer;
		this.select = new ol.interaction.Select({
			filter: function(f,l) 
			{	selLayer = l;
				return (l===wapp.vector || l===wapp.ripart.layer);
			},
			style: function(f,res)
			{	if (f.getGeometry().getType()=="Point")
				{	return $.merge( [ selPoint ], selLayer.getStyleFunction()(f,res));
				}
				else
				{	return $.merge( [ new ol.style.Style(
						{	stroke: selStroke,
							geometry: ol.geom.Polygon.fromExtent( f.getGeometry().getExtent() )
						}) ], selLayer.getStyleFunction()(f,res));
				}
			}});
		this.select.selectFeature = function(f, l)
		{	this.getFeatures().clear();
			selLayer = l;
			if (f) this.getFeatures().push(f);
			wapp.showSelect();
		};
		this.map.addInteraction(this.select);
		this.select.on("select", this.onSelect, this);
		wapp.onSelect();

		// Longtouch
		map.addInteraction(new ol.interaction.LongTouch(
			{	handleLongTouchEvent: function(e)
				{	wapp.select.getFeatures().clear();
					map.getView().setCenter(e.coordinate);
					wapp.showPage('fiche');
					wapp.showOnglet('signal');
					wapp.ripart.showFormulaire();
				}
			}));

		// Gestion du cache
		this.cache = new CacheMap({ loadPage: "#loadMap", listMap: '#cartes [data-list="maps"] ul' });

		// Brancher les signalements
		this.ripart = new RIPart(
			{	url: this.param.options.qlf ?  "https://qlf-collaboratif.ign.fr/collaboratif-develop/api/":null,
				infoElement: '#options .connect [data-input-role="info"] span.connected',
				countElement: '.georemsCount span',
				listElement: '#signalements [data-role="content"]',
				formElement: '#fiche .signaler',
				layer: new ol.layer.Vector(
				{	source: new ol.source.Vector(),
					name: "Signalements"
				}),
				// Selection d'un signalement
				onSelect: function(georem)
				{	var f = wapp.ripart.getFeature(georem);
					wapp.select.getFeatures().clear();
					wapp.select.selectFeature(f, wapp.ripart.layer);
					wapp.showOnglet("info");
					wapp.showSelect(true);
				},
				// Affichage du dialogue
				onShow: function(form)
				{	var f = wapp.select.getFeatures().item(0);
					if (f && f.get('georem'))
					{	f = false;
						wapp.select.getFeatures().clear();
					}
					var p = f ? f.getGeometry().getCoordinates() : wapp.map.getView().getCenter();
					p = ol.proj.transform(p, wapp.map.getView().getProjection(),'EPSG:4326');
					$("input.lon", form).val(p[0].toFixed(8));
					$("input.lat", form).val(p[1].toFixed(8));
					wapp.select.setActive(false);
				}, 
				// Formatage du signalement / verification avant envoie
				formatGeorem: function(georem, form)
				{	var f = wapp.select.getFeatures().item(0);
					if (f) georem.sketch = wapp.ripart.feature2sketch(f, wapp.map.getView().getProjection());
					if (!georem.comment) 
					{	wapp.alert ("Merci de laisser un commentaire...");
						return false;
					}
					// Forcer le groupe
					// georem.id_groupe = this.param.groupes[0].id_groupe;
					// Protocol
					georem.protocol = "_MONGUICHET_65876";
					georem.version = "0.1";
					return true;
				},
				/*
				// Localisation via GPS
				onLocate : function(loc)
				{	$("span.lon", this.formElement).text(loc.position[0].toFixed(7));
					$("span.lat", this.formElement).text(loc.position[1].toFixed(7));
					$("span.accuracy", this.formElement).text(loc.accuracy);
				}
				*/
			});
		$("#signalements button").click(function(){ wapp.select.getFeatures().clear(); });


		$("#fiche").on("showonglet hidepage", function(e)
		{	self.ripart.cancelFormulaire();
			if (!$(e.target).hasClass('signaler')) wapp.select.setActive(true);
		});

		$("#search").on("showpage", function(e)
		{	setTimeout(function(){ $("#search input").focus(); });
		});

		// Affichage des layers
		this.showLayers(this.param.layers);

		// Set parameters
		this.paramInput.change();

		// Fin
		wapp.wait(false);

	},

	/** Affichage des layers
	*/
	showLayers: function(vislayers, layers)
	{	if (vislayers && vislayers.length) 
		{	if (!layers) layers = this.map.getLayers().getArray();
			for (var i=0; i<layers.length; i++)
			{	if ($.inArray(layers[i].get('name'), vislayers)>=0) layers[i].setVisible(true);
				else layers[i].setVisible(false);
				if (layers[i].getLayers) this.showLayers(vislayers, layers[i].getLayers().getArray());
			}
		}
	},

	/** Enable map rotation
	*/
	rotateMap: function(b)
	{	if (!this.map) return;
		var inter = this.map.getInteractions().getArray().filter(function(interaction) 
		{	return interaction instanceof ol.interaction.PinchRotate
				|| interaction instanceof ol.interaction.DragRotate;
		});
		for (var i=0; i<inter.length; i++) inter[i].setActive(b);
	},
	
	/** Show/hide menu
	*/
	onMenu: function() 
	{	this.hidePage();
	},

	/** Fires when the user presses the back button
	*/
	onBackButton: function() 
	{	// Ne pas sortir si en cours de traitement
		if (this.isWaiting()) return;
		// Fermer avant de sortir
		if (this.isFullscreen()) this.hideFullscreen();
		else if (this.getPage()) this.hidePage();
		else if (this.isMenu()) this.hideMenu();
		else CordovApp.prototype.onBackButton.apply(this); 
	},

	/** Fires when the user presses the menu button
	* @api
	*/
	onMenuButton: function() { if (!this.isWaiting()) this.toggleMenu(); },

	/** Save current position 
	*/
	saveContext: function()
	{	var pos = this.map.getView().getCenter();
		var zoom = this.map.getView().getZoom();
		this.param['position'] = { lon:Math.round(pos[0]*100)/100, lat:Math.round(pos[1]*100)/100, zoom:zoom };
		var layers=[]; 
		function saveVisibility(lays)
		{	lays.forEach(function(l)
			{	if (l.getVisible() && l.get('name')) layers.push(l.get('name'));
				if (l.getLayers) saveVisibility(l.getLayers());
			});
		};
		saveVisibility(wapp.map.getLayers());
		this.param['layers'] = layers;
		this.saveParam();
	},

	/** Ask for quit on quit
	*/
	quit: function()
	{	this.saveContext();
		CordovApp.prototype.quit.apply(this);
	},

	/** Save context on pause
	*/
	pause: function()
	{	this.saveContext();
	}
	
});

