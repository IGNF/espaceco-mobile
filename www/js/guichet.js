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
	{	// Affichage d'une patience avant lancement
		wapp.waitLogo ("Chargement...", false);
		setTimeout(function(){ wapp.initWapp(); }, 200);
	},
	
	initWapp: function()
	{	var self = this; 
		// url du service => chercher sur internet
		geoportailConfig.url = "https://wxs.ign.fr/";

		/*
		// Splashscreen
		wapp.showPage('splash');
		setTimeout(function(){ wapp.hidePage('splash'); }, 2000);
		*/

		// Version => cordova-plugin-app-version ???
		$(".version").text(this.version);
		// Gestion de l'aide en ligne
		$("#help").click(wapp.help.hide);

		// Afficher les operations ponctuelles
		wapp.setOperations();

		// Gestion des parametres
		wapp.initParams();

		// Layers de l'application
		wapp.initMap();
		// Affichage des layers
		wapp.showLayers(this.param.layers);

		wapp.initControls();
		wapp.initInteractions();

		// Gestion du cache
		// this.cache = new CacheMap({ loadPage: "#loadMap", listMap: '#cartes [data-list="maps"] ul' });

		// Brancher les signalements
		wapp.initRipart();

		wapp.setDebugMode();

		// Fin
//		wapp.wait(false);
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
		var layers=[], hidden=[]; 
		function saveVisibility(lays)
		{	lays.forEach(function(l)
			{	if (l.getVisible() && l.get('name')) layers.push(l.get('name'));
				else if (l.get('name')) hidden.push(l.get('name'));
				if (l.getLayers) saveVisibility(l.getLayers());
			});
		};
		saveVisibility(wapp.map.getLayers());
		this.param['layers'] = layers;
		this.param['hidden'] = hidden;
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

/** Message d'attente avec affichage du logo du groupe
 */
wapp.waitLogo = function(info, anim)
{	if (this.isWaiting() && $("#wait").hasClass('splash'))
	{	$("#wait p").text(info);
	}
	else
	{	var div = $("<div>").append($("<p>").text(info));
		try {
			var profil = JSON.parse(localStorage["WebApp@ripart"]).profil
			this.getLogo(profil, function(logo)
			{	$("<img>").attr('src', logo || "")
					.prependTo(div);
			});
		} catch(e) {};
		this.wait (div, { className:'splash', anim: anim });
	}
};

/** Afficher une operation ponctuelle
*/
wapp.setOperations = function()
{	var currentOperations = {};
	if (!wapp.param.operations) wapp.param.operations = {};
	$(".operation[data-date]").each(function()
	{	var ope = $(this);
		if ((new Date()) < new Date(ope.data('date')))
		{	ope.show();
			var name = ope.data('name') || "none";
			var icon = ope.data('icon') || 'star-o';
			var className = ope.data('class')||"";
			var freq = Number(ope.data('frequence')||0.15);
			if (!wapp.param.operations[name] || Math.random()<freq)
			{	wapp.notinfo ($(".title",ope).html(), $(".msg", ope).html(),
					{ icon: "<i class='fa fa-"+icon+"'></i>", className: className });
			}
			currentOperations[name] = true;
		}
		else 
		{	ope.hide();
		}
	});
	wapp.param.operations = currentOperations;
};

/** Initialisation des parametres de l'application
*/
wapp.initParams = function()
{	if (!this.param.options) this.param.options={};
	var options = this.param.options;
	var inputs = this.paramInput = this.setParamInput("#options", options, function(e)
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
				case "toleranceGPS":
					var val = Number(e.val) || 100;
					if (val<0) val = -val;
					if (inputs && val != options.toleranceGPS)
					{	options.toleranceGPS = val;
						inputs.change();
					}
					if (wapp.interactions)
					{	wapp.interactions.geolocation.set('tolerance', val);
					}
					break;
				case "minGPSAccuracy":
					var val = Number(e.val) || 100;
					if (val<0) val = -val;
					if (inputs && val != options.minGPSAccuracy)
					{	options.minGPSAccuracy = val;
						inputs.change();
					}
					if (wapp.interactions)
					{	wapp.interactions.geolocation.set('minAccuracy', val);
					}
					break;
				case "qlf":
					if (wapp.ripart)
					{	var qlf = /qlf/.test(wapp.ripart.getServiceUrl());
						if (e.val != qlf) 
						{	if (e.val) wapp.ripart.setServiceUrl("https://qlf-collaboratif.ign.fr/collaboratif-develop/api/");
							else wapp.ripart.setServiceUrl("https://espacecollaboratif.ign.fr/api/");
							wapp.ripart.deconnect();
						}
					}
					break;
				default: break;
			}
		});
};

/** Initialise la carte
*/
wapp.initMap = function()
{	// Layers (set hdpi:false to enable tile cache)
	var layers = this.layers =  [
		// Fonds de plan
		new ol.layer.Group(
		{	name:"Fond de plan",
			openInLayerSwitcher: true,
			layers:
			[	new ol.layer.Geoportail("GEOGRAPHICALGRIDSYSTEMS.MAPS", {baseLayer: true, hidpi: false, visible: true }),
				new	ol.layer.Geoportail("GEOGRAPHICALGRIDSYSTEMS.PLANIGN", {baseLayer: true, hidpi: false, visible: false }),
				new	ol.layer.Geoportail("ORTHOIMAGERY.ORTHOPHOTOS", {baseLayer: true, hidpi: false, visible: false })
			]
		}),
		// Layer pour l'affichage du cache
		new ol.layer.Group({ title:"Mes cartes", name: "cache", displayInLayerSwitcher: false }),
		// Layer pour l'affichage du cache
		new ol.layer.Group({ title:"Mes couches", name: "layerGroup", displayInLayerSwitcher: false }),
		// Overlays
		new ol.layer.Geoportail("ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW", { hidpi: false, visible: false }),
//		new ol.layer.Geoportail("BUILDINGS.BUILDINGS", { hidpi: false, visible: false }),
		new ol.layer.Geoportail("CADASTRALPARCELS.PARCELS", { hidpi: false, visible: false }),
//		new ol.layer.Geoportail("TRANSPORTNETWORKS.ROADS", { hidpi: false, visible: false }),
		new ol.layer.Geoportail("GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1", { hidpi: false, visible: false }),
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
				"tileLoadFunction": ol.source.Geoportail.tileLoadFunctionWithAuthentication(auth, "image/png"),
				"params": {
					"LAYERS": "AD.Address",
					"FORMAT": "image/png",
					"VERSION": "1.3.0"
				}
			})
		}),
		// Layer pour l'affichage du cache
		new ol.layer.Group({ title:"Mes couches", name: "groupe", displayInLayerSwitcher: false }),
		// Layer pour l'affichage du guichet
		new ol.layer.Group({ title:"Mon guichet", name: "guichet", visible: true })
	];

	// The map
	var pos = this.param.position || {};
	var map = this.map = new ol.Map.Geoportail
		({	target: 'map',
			key: apiKey,
			authentication: auth, 
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


	// Verifier qu'on a bien au moins un layer affiche
	function checkVisible(layers)
	{	var visible = false;
		if (!layers) layers = wapp.map.getLayers();
		layers.forEach(function(l)
		{	if (!(l instanceof ol.layer.Vector) && l.getVisible()) 
			{	if (l instanceof ol.layer.Group)
				{	if (checkVisible(l.getLayers())) visible=true;
				}
				else visible=true;
			}
		});
		return visible;
	};
	$("#layers").on("hidepage", function()
	{	if (!checkVisible())
		{	wapp.dialog.show ("Toutes les couches sont masquées.<br/>"
				+"Il se peut que vous ayez des problèmes à vous repérer&nbsp;!", 
				{	title: "ATTENTION",
					icon: "<i class='fa fa-eye-slash fa-3x'></i>",
					className: "alert",
					buttons:{ cancel:"ok" }
				});
		}

	});
};

/** Initialise les controls de la carte
*/
wapp.initControls = function()
{	var map = this.map;
	
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
			authentication: auth,
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
				$("#search input").focus();
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
	map.addControl (new ol.control.LayerSwitcher({ target:$("#layerswitcher").get(0), extent:true, reordering: true }));

	// Geolocation Control
	var geoloc = window.geoloc = new ol.control.Geolocate();
	geoloc.on("geolocate", function(e) 
		{	centerMap(e.position);
		});
	map.addControl(geoloc);
};


/** Ajout des interactions sur la carte
*/
wapp.initInteractions = function()
{	var map = this.map;
	this.interactions = {};
	this.overlays = {};
	//	Selection
	var selPoint = new ol.style.Style (
	{	image: new ol.style.Circle(
		{	stroke: new ol.style.Stroke({color: '#f00', width: 4}),
			radius: 20
		}),
	});
	var selStroke = new ol.style.Stroke({color: '#f00', width: 3 });

	var selLayer;
	this.select = new ol.interaction.Select({
		hitTolerance: 5,
		filter: function(f,l) 
		{	selLayer = l;
			return (true);
		},
		style: this.redStyle()
/*		
		function(f,res)
		{	if (f.getGeometry().getType()=="Point")
			{	return $.merge( [ selPoint ], selLayer.getStyleFunction()(f,res));
			}
			else
			{	return $.merge( [ new ol.style.Style(
					{	stroke: selStroke,
						geometry: ol.geom.Polygon.fromExtent( f.getGeometry().getExtent() )
					}) ], selLayer.getStyleFunction()(f,res));
			}
		}
*/
	});
	this.select.selectFeature = function(f, l)
	{	this.getFeatures().clear();
		selLayer = l;
		if (f) this.getFeatures().push(f);
		wapp.showSelect();
	};
	this.map.addInteraction(this.select);
	this.select.on("select", this.onSelect, this);
	wapp.onSelect();

	// getFeatureInfo interaction
	function getFeatureInfo(l, coord)
	{	if (!l.getSource().getGetFeatureInfoUrl) return;
		var	url = l.getSource().getGetFeatureInfoUrl(
			coord, 
			map.getView().getResolution(),
			map.getView().getProjection(),
			{ info_format: "application/json" }
		);
		var t = new Date();
		$.ajax(url, {
			dataType: "json",
			success: function(resp)
			{	var f = resp.features[0];
				if (f) 
				{	var crs = resp.crs.properties.name.replace(/(.*)EPSG\:\:(\d*)$/, "$2");
					var proj = ol.proj.get("EPSG:"+crs);
					if (proj)
					{	var geom = new ol.geom[f.geometry.type](f.geometry.coordinates);
						geom.transform(proj, map.getView().getProjection());
						var feature = new ol.Feature(geom);
						feature.layer = l;
						delete f.geometry;
						delete f.properties.bbox;
						feature.setProperties(f.properties);
						setTimeout(
							function(){
								wapp.select.getFeatures().push(feature);
								wapp.onSelect({ selected:[feature] });
							}, Math.max(0, 400+(t-(new Date())))
						)
					}
				}
			}
		});
	}
	var lgroup = map.getLayersByName("groupe")[0];
	map.on ("click", function(e) {
		if (!wapp.select.getFeatures().length)
		{	// Test pixel on at position
			wapp.map.forEachLayerAtPixel(e.pixel, function(layer)
			{	//if (layer.get("getFeatureInfoMask")) 
				getFeatureInfo(layer, e.coordinate);
			});
			/*
			var layers = lgroup.getLayers().getArray();
			for (var k=0, l; l=layers[k]; k++) getFeatureInfo(l, e.coordinate);
			*/
		}
	})

	// Longtouch
	map.addInteraction(new ol.interaction.LongTouch(
		{	handleLongTouchEvent: function(e)
			{	wapp.select.getFeatures().clear();
				map.getView().setCenter(e.coordinate);
				wapp.ripart.showFormulaire();
			}
		}));

	// Geolocation draw
	var geodrawlayer = new ol.layer.Vector(
	{	name: 'Trace',
		geolocation: true,
		vivible: true,
		displayInLayerSwitcher: false,
		source: new ol.source.Vector(),
		style: 
		[	new ol.style.Style({
				stroke: new ol.style.Stroke ({ color: [255, 255, 255, 0.8], width: 5 })
			}),
			new ol.style.Style({
				stroke: new ol.style.Stroke ({ color: [0, 153, 255, 1], width: 3 })
			})
		]
	});
	this.overlays.gps = geodrawlayer;
	geodrawlayer.getSource().on('addfeature', function(e) { e.feature.layer = geodrawlayer; });
	map.addLayer(geodrawlayer);
	// Draw interaction
	var geodraw = this.interactions.geolocation = new ol.interaction.GeolocationDraw(
		{	source: geodrawlayer.getSource(),
			type: 'LineString',
			followTrack: 'auto',
			zoom: 17,
			tolerance: wapp.param.toleranceGPS||5,
			minAccuracy: wapp.param.minGPSAccuracy||20
		});
	geodraw.setActive(false);
	map.addInteraction(geodraw);
	
	var centerButton = new ol.control.TextButton(
		{	"className": "geodrawCtrl", 
			"html": "<i class='fa fa-location-arrow'></i> Recentrer",
			"handleClick": function()
			{	$(centerButton.element).hide();
				geodraw.setFollowTrack('auto');
			}
		});
	map.addControl (centerButton);
	geodraw.on('drawend', function()
	{	$(centerButton.element).hide();
	});
	geodraw.on('follow', function(e)
	{	if (!e.following) $(centerButton.element).show();
	});

	// Control d'activation
	map.addControl (new ol.control.Toggle(
	{	"className": "geodrawCtrl", 
		"html": "<i class='fa fa-location-arrow'></i>",
		"toggleFn": function(b)
		{	if (geodraw.getActive())
			{	geodraw.stop();
				$(centerButton.element).hide();
				geodraw.setActive(false);
				geodraw.setFollowTrack('auto');
			}
			else
			{	geodraw.setActive(true);
				geodraw.start();
			}
		}
	}));

};

/** Initialisation des signalements
*/
wapp.initRipart = function()
{	var self = this;

	this.ripart = new RIPart(
		{	url: this.param.options.qlf ?  "https://qlf-collaboratif.ign.fr/collaboratif-develop/api/":null,
			infoElement: '#options .connect [data-input-role="info"] span.connected',
			countElement: '.georemsCount span',
			listElement: '#signalements [data-role="content"]',
			formElement: '#fiche .signaler',
			layer: new ol.layer.Vector(
			{	source: new ol.source.Vector(),
				name: "Mes signalements"
			}),
			// Selection d'un signalement
			onSelect: function(georem, add)
			{	var f = wapp.ripart.getFeature(georem);
				wapp.select.getFeatures().clear();
				wapp.select.selectFeature(f, wapp.ripart.layer);
				wapp.showOnglet("info");
				wapp.showSelect(!add);
			},
			// Affichage du dialogue
			onShow: function(form)
			{	wapp.showPage('fiche');
				wapp.showOnglet('signal');
				var f = wapp.select.getFeatures().item(0);
				if (f && f.get('georem'))
				{	f = false;
				}
				wapp.select.getFeatures().clear();
				wapp.ripart.addFeature(f);
				var p = f ? ol.extent.getCenter(f.getGeometry().getExtent()) : wapp.map.getView().getCenter();
				p = ol.proj.transform(p, wapp.map.getView().getProjection(),'EPSG:4326');
				$("input.lon", form).val(p[0].toFixed(8));
				$("input.lat", form).val(p[1].toFixed(8));
				// Pas d'objets a ajouter ?
				if (f || wapp.vector.length || wapp.overlays.gps.getSource().getFeatures().length)
				{	$(".addfeatures", wapp.ripart.formElement).show();
				}
				else
				{	$(".addfeatures", wapp.ripart.formElement).hide();
				}
				// Ne plus selectionner
				wapp.select.setActive(false);
			}, 
			// Formatage du signalement / verification avant envoie
			formatGeorem: function(georem, form)
			{	if (!georem.comment) 
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

	wapp.ripart.on("changegroup", function(e){ wapp.changeGroup(e); });
		
	// Patience
	wapp.waitLogo ("Connexion...");
	
	$("#signalements button").click(function(){ wapp.select.getFeatures().clear(); });
	if (wapp.ripart.param.profil) 
	{	wapp.getLogo(wapp.ripart.param.profil, function(logo)
		{	$("#splash img").attr('src', logo || "");
		});
	}

	$("#fiche").on("showonglet hidepage", function(e)
	{	self.ripart.cancelFormulaire();
		if (!$(e.target).hasClass('signaler')) wapp.select.setActive(true);
	});
						 
	// Set parameters
	this.paramInput.change();

	// Actualiser le compte
	this.ripart.checkUserInfo(
		function ()
		{	wapp.wait(false); 
			wapp.notification("Connecté au service",1200);
			wapp.initGuichets();
		}, 
		function()
		{	wapp.wait(false); 
			wapp.initGuichets();
		}
	);

	// Gerer la coherence
	$("#fiche").on('showpage', function(e)
	{	var signalDiv = $(".signaler", this);
		if (wapp.ripart.param.groupes && wapp.ripart.param.groupes.length > 1)
		{	$(".changeGroupe", signalDiv).show();
		}
		else 
		{	$(".changeGroupe", signalDiv).hide();
		}
		// Groupe public
		if (wapp.ripart.param.profil && wapp.ripart.param.profil.status!="prive")
		{	$(".warning_public", signalDiv).show();
		}
		else
		{	$(".warning_public", signalDiv).hide();
		}
	});
};

/** On a change de groupe 
*/
wapp.changeGroup = function (e)
{	// Supprimer les layers des autres groupes
	var lgroup = wapp.map.getLayersByName("groupe")[0];
	lgroup.getLayers().clear();
	// Verifier les layers disponibles
	var layers = e.group.layers;
	var attribution = new ol.Attribution({ "html":e.group.nom });
	for (var i=0, l; l = layers[i]; i++)
	{	if (l.type=="WMS")
		{	var extent = l.extent;
			extent = ol.proj.transformExtent(extent, "EPSG:4326", "EPSG:3857");
			var wmsParam = {
				"title": l.nom,
				"extent": extent[0] ? extent : undefined,
				"minResolution": new ol.View({ zoom: l.maxzoom }).getResolution(),
				"maxResolution": new ol.View({ zoom: l.minzoom }).getResolution(),
				"getFeatureInfoMask": l.getFeatureInfoMask,
				"source": new ol.source.TileWMS({
					"url": l.url,
					"projection": "EPSG:3857",
					// "crossOrigin": "anonymous",
					"params": {
						"LAYERS": l.layer,
						"FORMAT": l.format,
						"VERSION": l.version
					},
					"attributions": [attribution]
				})
			};
			lgroup.getLayers().push( new ol.layer.Tile (wmsParam) );
		}
	}
	lgroup.set('title', e.group.nom);
	lgroup.set("displayInLayerSwitcher", !!(lgroup.getLayers().getLength()));
};

/** Gestion des parametres caches et du mode debug
*/
wapp.setDebugMode = function()
{	var cheat = 0;
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
};

/** Affichage des layers
*/
wapp.showLayers = function(vislayers, layers)
{	if (vislayers && vislayers.length) 
	{	if (!layers) layers = this.map.getLayers().getArray();
		for (var i=0; i<layers.length; i++)
		{	if ($.inArray(layers[i].get('name'), vislayers)>=0) layers[i].setVisible(true);
			else layers[i].setVisible(false);
			if (layers[i].getLayers) this.showLayers(vislayers, layers[i].getLayers().getArray());
		}
	}
};

/** Sauvegarder une trace GPS */
wapp.saveGPS = function() 
{	var f = wapp.select.getFeatures().item(0);
	if (f.getGeometry().getType()=="LineString")
	{	var format = new ol.format.GPX();
		var gpx = '<?xml version="1.0"?>'+format.writeFeatures([f], 
		{	featureProjection:wapp.map.getView().getProjection()
		});
		
		// Nom sur la date d'aujourd'hui
		var d = new Date();
		d = d.getFullYear()
			+"-"+ ("00" + (d.getMonth() + 1)).slice(-2)
			+"-"+ ("00" + d.getDate()).slice(-2);
		var filename = d+".gpx";

		function write()
		{	CordovApp.File.write ("SD/GPX/"+filename, gpx, function()
			{	wapp.message("La fichier GPX/"+filename+" a bien été enregistré","GPX")
			}, function()
			{	wapp.alert ("Impossible de créer le fichier");
			});
		};

		// Verifier la non existence du fichier
		CordovApp.File.listDirectory("SD/GPX",
			function(files)
			{	var nb = 0;
				while (true)
				{	for (var i=0; i<files.length; i++)
					{	if (files[i].name===filename) 
						{	nb++;
							break;
						}
					}
					// incrmenter ?
					if (i==files.length) break;
					else filename = d+"-"+nb+".gpx";
				}
				write();
			}, write );
	}
};

/** Sauvegarder une trace GPS */
wapp.redStyle = function() 
{	var redStroke = new ol.style.Stroke({ color: "#f00", width: 2 });
	var whiteStroke = new ol.style.Stroke({ color: [255,255,255,0.8], width: 5 });
	var redFill = new ol.style.Fill({ color: [255,0,0,0.5] });
	return [
		new ol.style.Style ({
			image: new ol.style.Circle ({ stroke: whiteStroke, fill: redFill, radius: 5 }),
			stroke: whiteStroke,
			fill: redFill
		}),
		new ol.style.Style ({
			image: new ol.style.Circle ({ stroke: redStroke, radius: 5 }),
			stroke: redStroke
		})
	];
};