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
					default: break;
				}
			});

		// Layers (set hdpi:false to enable tile cache)
		var layers = this.layers =  [
				// Fonds de plan
				new ol.layer.Group(
				{	name:"Fond de plan",
					layers:
					[	new ol.layer.Tile({ name:"OSM", source: new ol.source.OSM(), baseLayer: true, hidpi: false, visible: false }),
						new ol.layer.Geoportail("GEOGRAPHICALGRIDSYSTEMS.MAPS", {baseLayer: true, hidpi: false, visible: true }),
						new	ol.layer.Geoportail("ORTHOIMAGERY.ORTHOPHOTOS", {baseLayer: true, hidpi: false, visible: false })
					]
				}),
				// Layer pour l'affichage du cache
				new ol.layer.Group({ title:"Mes cartes", name: "cache" }),
				new ol.layer.Geoportail("CADASTRALPARCELS.PARCELS", { hidpi: false, visible: false }),
				new ol.layer.Geoportail("TRANSPORTNETWORKS.ROADS", { hidpi: false, visible: false })
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

		// Set parameters
		this.paramInput.change();

		// Geolocation Control
		//this.addLocateControl(map);
		var locCtrl = new ol.control.GeoportailLocate(
			{	apiKey:apiKey, 
				target: $('#search [data-role="content"]').get(0),
				onGeocode: function(pos, r)
				{	map.getView().setCenterAtLonlat(pos);
					wapp.hidePage();
				}
			});
		map.addControl (locCtrl);

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
		{	"class":"menuCtrl", 
			"html":"<i class='fa fa-bars'></i>",
			"toggleFn": function(b)
			{	wapp.toggleMenu();
			}
		}));

		// Layer switcher
		map.addControl (new ol.control.LayerSwitcher({ target:$("#layerswitcher").get(0), extent:true, reordering: false }));

		// Layer switcher
		var geoloc = window.geoloc = new ol.control.Geolocate();
		geoloc.on("geolocate", function(e) 
			{	wapp.map.getView().setCenter(e.position);
				wapp.map.pulse(e.position);
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
		this.select = new ol.interaction.Select({ 
			style: function(f,res)
			{	if (f.getGeometry().getType()=="Point")
				{	return $.merge( [ selPoint ], wapp.vector.getStyleFunction()(f,res));
				}
				else
				{	return $.merge( [ new ol.style.Style(
						{	stroke: selStroke,
							geometry: ol.geom.Polygon.fromExtent( f.getGeometry().getExtent() )
						}) ], wapp.vector.getStyleFunction()(f,res));
				}
			}});
		this.map.addInteraction(this.select);
		this.select.on("select", this.onSelect, this);

		// Gestion du cache
		this.cache = new CacheMap({ loadPage: "#loadMap", listMap: '#cartes [data-list="maps"] ul' });

		// Brancher les remontees
		this.ripart = new RIPart(
			{	infoElement: '#options .connect [data-input-role="info"] span.connected',
				countElement: '.georemsCount span',
				listElement: '#signalements [data-role="content"]',
				formElement: '#fiche .signaler',
				onShow: function(form)
				{	var f = wapp.select.getFeatures().item(0);
					var p = f ? f.getGeometry().getCoordinates() : wapp.map.getView().getCenter();
					p = ol.proj.transform(p, wapp.map.getView().getProjection(),'EPSG:4326');
					$("input.lon", form).val(p[0].toFixed(8));
					$("input.lat", form).val(p[1].toFixed(8));
					wapp.select.setActive(false);
				}, 
				formatGeorem: function(georem, form)
				{	var f = wapp.select.getFeatures().item(0);
					if (f) georem.sketch = wapp.ripart.feature2sketch(f, wapp.map.getView().getProjection());
					if (!georem.comment) 
					{	wapp.alert ("Merci de laisser un commentaire...");
						return false;
					}
					return true;
				},
				/*
				onLocate : function(loc)
				{	$("span.lon", this.formElement).text(loc.position[0].toFixed(7));
					$("span.lat", this.formElement).text(loc.position[1].toFixed(7));
					$("span.accuracy", this.formElement).text(loc.accuracy);
				}
				*/
			});
		this.ripart.setServiceUrl("https://qlf-collaboratif.ign.fr/collaboratif-develop/api/");

		$("#fiche").on("showonglet hidepage", function(e)
		{	self.ripart.cancelFormulaire();
			if (!$(e.target).hasClass('signaler')) wapp.select.setActive(true);
		});

		// Affichage des layers
		this.showLayers(this.param.layers);

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
	
	/** A new page is shown
	*/
	onShowPage: function(page, e)
	{	switch(page)
		{	// Resize map
			case "fiche": 
			{	this.map.updateSize(); 
				break;
			}
			default: break;
		}
	},

	/** A new page is hidden
	*/
	onHidePage: function(page, e)
	{	switch(page)
		{	// Resize map
			case "fiche": this.map.updateSize(); break;
			default: break;
		}
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


/** Guichet en cours de modification
*/
wapp.setGuichet = function(fullname)
{	if (!this.ripart.isConnected() || !this.ripart.param.pwd)
	{	wapp.message ("Vous devez être identifié pour accéder à ce guichet...",
				"Connexion", 
				{	ok:"ok", connect: "Se connecter..."},
				function(b)
				{	if (b=="connect") 
					{	wapp.ripart.connectDialog (null, function()
						{	if (wapp.ripart.isConnected() && wapp.ripart.param.pwd)
								wapp.setGuichet(fullname); 
						});
					}
				});
		return;
	}

	this.select.getFeatures().clear()

	if (this.vector) this.map.removeLayer(this.vector);

	var guichet = fullname.split(":");

	// Create layer
	this.vector = new ol.layer.Vector.Webpart(
		{	url: "https://espacecollaboratif.ign.fr/gcms/database/",
			name: guichet[1],
			database: guichet[0],
			username: wapp.ripart.param.user,
			password: wapp.ripart.param.pwd,
			style: guichet.style,
			// Limit resolution to avoid large area request
			maxResolution: 40 // zoom 13
		},
		{	// preserved: select.getFeatures(),
			filter: ( guichet.filter ),
			// Tile zoom to calculate tiles
			tileZoom: guichet.tileZoom||13,
			maxFeatures: 5000
		});
	this.vector.on("error", function(e)
	{	if (e.status===401)
		{	wapp.message ("Impossible de charger la couche.<br/>"+e.status+" - "+e.error,
				"Connexion", { ok:"ok", connect: "Se connecter..." },
				function(b)
				{	if (b=="connect") wapp.ripart.connectDialog();
				});
		}
		else
		{	wapp.alert ("Impossible de charger la couche.<br/>"+e.status+" - "+e.error);
		}
		return;
	});
	this.vector.on("ready", function()
	{	wapp.setFiche();
	});
	this.map.addLayer(this.vector);
};

/** Afficher la selection dans la barre et la fiche
*/
wapp.onSelect = function(e)
{	var f = e.selected[0];
	// wapp.ripart.cancelFormulaire();
	$("#selection").html ( f ? (f.get("nom")||"Afficher la sélection...") : "" );
	if (wapp.isPage("fiche")) wapp.showSelect();
};

/* Afficher la fiche
*/
wapp.showSelect = function()
{	var f = this.select.getFeatures().item(0);
	var div = $('#fiche .fiche');
	if (!f) 
	{	div.addClass("nosel");
		this.currentProperties = null;
	}
	else
	{	div.removeClass("nosel");
		this.currentProperties = wapp.setParamInput($("ul", div), f.getProperties());
	}
	wapp.showPage("fiche");
};

/* Valider la fiche courante
*/
wapp.validFiche = function()
{	var f = this.select.getFeatures().item(0);
	if (f && this.currentProperties)
	{	var p = this.currentProperties.getParams();
		var ftype = wapp.vector.getFeatureType();
		for (var i in ftype.attributes) if (ftype.attributes.hasOwnProperty(i) && i!=ftype.geometryName)
		{	f.set (i, p[i]);
		}
		wapp.notification("Les données ont été mises à jours...",1000);
	}
}

/** Preparer les champs de la fiche au chargement du layer
*/
wapp.setFiche = function()
{	var ftype = wapp.vector.getFeatureType();
	var div = $('#fiche .fiche');
	var ul = $("ul", div).html("");
	var li, atype, vals, atype;
	var match = {"Choice": "select", "Date": "date", "Integer": "number", "Double": "number", "String": "text" };
	for (var i in ftype.attributes) if (ftype.attributes.hasOwnProperty(i) && i!=ftype.geometryName)
	{	atype = match[ftype.attributes[i].type] || "text";
		li = $('<li>').attr('data-input', atype).attr('data-param',i).appendTo(ul);
		$("<label>").text(ftype.attributes[i].name).appendTo(li);
		switch (atype)
		{	case "select":
				vals = ftype.attributes[i].listOfValues;
				for (var k=0; k<vals.length; k++)
				{	$('<div>').attr('data-input-role',"option")
						.attr('data-val',vals[k])
						.text(vals[k])
						.appendTo(li);
				}
				break;
			default:
				var input = $('<input>').attr('type',atype).appendTo(li);
				if (ftype.attributes[i].type == "Double")
				{	input.attr("step","any");
				}
				if (atype=="text"||atype=="number") $('<i class="clear-input"></i>').appendTo(li);
				break;
		}
	}
};

/** Affichage de la page de gestion des cartes
*	- Mise a jour des infos du guichet
*/
$("#cartes").on("showpage", function(e)
{	if (!wapp.vector) return;
	var ftype = wapp.vector.getFeatureType();
	var d = $("li[title=\""+ftype.fullName+"\"]", this);

	$('li', this).removeClass("select");
	$('li [data-input-role="info"]', this).html("");

	d.addClass('select');

	if (wapp.vector.getSource())
	{	var features = wapp.vector.getSource().getFeatures();
		var nb = features.length;
		var t={};
		for (var i=0, f; f = features[i]; i++)
		{	var s = f.getState();
			if (!t[s]) t[s]=1;
			else t[s] += 1;
		}

		var info = nb + " objet(s) chargé(s)"
			+ " - "
			+ (t.Update||0) + " objet(s) modifié(s)";
		$('[data-input-role="info"]', d).html(info);
	}
});