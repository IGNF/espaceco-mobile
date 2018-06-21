/*  __  __                      _    _        _   
   |  \/  |___ _ _    __ _ _  _(_)__| |_  ___| |_ 
   | |\/| / _ \ ' \  / _` | || | / _| ' \/ -_)  _|
   |_|  |_\___/_||_| \__, |\_,_|_\__|_||_\___|\__|
                     |___/                        
*/
/** Gestion des guichets
* 
*/
(function()
{

/** Recherche des guichets de l'utilisateur
*/
wapp.initGuichets = function()
{	// Reset list
	var ul = $('#cartes [data-list="guichets"] ul.guichet');
	ul.html("");
	if (!this.ripart.isConnected()) return;
	// Recherche des groupes
	var groupes = wapp.ripart.param.groupes;
	var current = {};
	for (var i=0, g; g = groupes[i]; i++)
	{	// Chargement des logos
		if (g.logo) 
		{	CordovApp.File.dowloadFile(g.logo, "TMP/logo/"+g.id_groupe);
		}
		// Guichet courant
		if (this.ripart.param.guichet == g.id_groupe) current = g;
		// Affichage si WFS
		var couches = "";
		for (var j=0; j<g.layers.length; j++) 
		{	if (g.layers[j].type=="WFS") couches += (couches?", ":"")+g.layers[j].nom;
		}
		if (couches)
		{	var li = $("<li>")
				.data('groupe', g)
				.text(g.nom)
				.append($("<i>").text(couches))
				.attr("data-input","")
				.click(function()
				{	var self = $(this);
					if (!self.hasClass('selected'))
					{	wapp.setGuichet($(this).data('groupe'));
						wapp.hidePage();
					}
					else
					{	wapp.setGuichet();
						// Faire clignoter
						self.addClass('active');
						setTimeout(function(){ self.removeClass('active'); }, 200);
					}
				})
				.appendTo(ul);
			wapp.getLogo (g, function(f)
			{	$("<img>").attr("src",f).prependTo(this);
			}, li);
		}
	}
	if ($("li", ul).length) $('#cartes [data-list="guichets"] ul.nomap').hide();
	else $('#cartes [data-list="guichets"] ul.nomap').show();
	wapp.setGuichet(current);
};

/** Recupere le logo d'un goupe
 * @param {any} g le groupe
 * @param {function} cback callback fonction qui renvoie le nom du fichier
 */
wapp.getLogo = function (g, cback, scope)
{	
	CordovApp.File.getFile("TMP/logo/"+g.id_groupe, 
		function(fileEntry) { 
			cback.call(scope, fileEntry.toURL()); 
		}, 
		function() { 
			cback.call(scope, g.logo); 
		});
}

/** Guichet en cours de modification
*/
wapp.setGuichet = function(groupe)
{	if (!groupe) groupe = {};
	// Layer du guichet
	var guichet = wapp.map.getLayersByName('guichet')[0];
	// Nouveau guichet
	this.ripart.param.guichet = groupe.id_groupe;
	wapp.ripart.saveParam();
	// Mettre a jour la liste
	$('#cartes [data-list="guichets"] ul.guichet li').each(function()
	{	if ($(this).data('groupe')===groupe) $(this).addClass('selected');
		else $(this).removeClass('selected');
	});
	// Layers du guichet
	guichet.getLayers().clear();
	this.vector = [];
	if (!groupe.layers) 
	{	guichet.set("displayInLayerSwitcher", false);
		return;
	}
	guichet.set("displayInLayerSwitcher", true);
	guichet.set("title", groupe.nom);
	var nb=0, nbLoad=0;
	var loading = {};
	// Ajouter les layers Webpart
	wapp.setSearchSource ();
	for (var i=0, l; l=groupe.layers[i]; i++)
	{	if (l.type=="WFS")
		{	nb++;
			var vector;
			// WFS externe
			if (l.external) {
				if (!/sitecentroid/.test(l.typename)) l.typename+=',sitecentroid';
				// Methode de chargement
				l.strategy = new ol.loadingstrategy.all();
				l.once = true;			// Chargement en une fois
				l.search = 'nom';		// Propriete de recherche
				l.attach = true;		// Joindre aux remontees
				// Gestion des attributs
				l.attributes = {
					/* Symbologie * /
					"symb__label" : { "title" : "symb@label", "type" : "Style"},
					"symb__lColor" : { "title" : "symb@lColor", "type" : "Style"},
					"symb__lsColor" : { "title" : "symb@lsColor", "type" : "Style"},
					"symb__lSize" : { "title" : "symb@lSize", "type" : "Style"},
					"symb__sColor" : { "title" : "symb@sColor", "type" : "Style"},
					"symb__sWidth" : { "title" : "symb@sWidth", "type" : "Style"},
					"symb__sDash" : { "title" : "symb@sDash", "type" : "Style"},
					"symb__fColor" : { "title" : "symb@fColor", "type" : "Style"},
					"symb__fPattern" : { "title" : "symb@fPattern", "type" : "Style"},
					"symb__pColor" : { "title" : "symb@pColor", "type" : "Style"},
					"symb__pAngle" : { "title" : "symb@pAngle", "type" : "Style"},
					"symb__pWidth" : { "title" : "symb@pWidth", "type" : "Style"},
					"symb__pSpace" : { "title" : "symb@pSpace", "type" : "Style"},
					/*/
					"symb__label" : { "title" : "symb@label", "type" : "Style"},
					"symb__sColor" : { "title" : "symb@sColor", "type" : "Style"},
					"symb__sWidth" : { "title" : "symb@sWidth", "type" : "Style"},
					"symb__sDash" : { "title" : "symb@sDash", "type" : "Style"},
					"symb__fColor" : { "title" : "symb@fColor", "type" : "Style"},
					"symb__fPattern" : { "title" : "symb@fPattern", "type" : "Style"},
					"symb__pColor" : { "title" : "symb@pColor", "type" : "Style"},
					/* unused */
					"symb__pPattern" : { "title" : "symb@pPattern", "type" : "Style"},
					/* Attributs */
					"nom" : { "title" : "Site@Nom", "type" : "String", "readOnly":true},
					"label" : { "title" : "Informations générales@Nom", "type" : "String", "readOnly":true},
					"surface" : { "title" : "Informations générales@Surface", "type" : "Float", "readOnly":true},
					"essence_principale" : { "title" : "Informations@Essence principale", "type" : "String", "readOnly":true},
					"date_implantation" : { "title" : "Informations@Date d'implantation", "type" : "String", "readOnly":true},
					"peuplement_actuel" : { "title" : "Informations@Type de peuplement actuel", "type" : "String", "readOnly":true},
					"peuplement_cible" : { "title" : "Informations@Type de peuplement cible", "type" : "String", "readOnly":true},
					"observations" : { "title" : "Informations@Observations", "type" : "String", "readOnly":true},
					"structure" : { "title" : "Informations@Répartition par classe de diamètre", "type" : "String", "readOnly":true},
					"qualite" : { "title" : "Informations@Qualitatif", "type" : "String", "readOnly":true},
					"surface_terriere" : { "title" : "Informations@Surface terrière", "type" : "String", "readOnly":true},
					/* Interventions */
					"interventions_psg" : { "title" : "Interventions PSG@Interventions", "type" : "JsonValue", "readOnly":true},
					"interventions_hpsg" : { "title" : "Interventions hors-PSG@Interventions", "type" : "JsonValue", "readOnly":true},
				
					/* unused * /
					"symb__pPattern" : { "title" : "symb@pPattern", "type" : "Style"},
					/* Attributs * /
					"id": { "title": "Informations générales@Identifiant"},
					"site_id": { "title": "Informations générales@No du site"},
					"label" : { "title" : "Informations générales@Nom", "type" : "String", "readOnly":true},
					"surface" : { "title" : "Informations générales@Surface", "type" : "Float", "readOnly":true},
					"essence_principale" : { "title" : "Informations générales@Essence principale", "type" : "String", "readOnly":true},
					"date_implantation" : { "title" : "Informations générales@Date d'implantation", "type" : "String", "readOnly":true},
					"peuplement_actuel" : { "title" : "Informations générales@Type de peuplement actuel", "type" : "String", "readOnly":true},
					"peuplement_cible" : { "title" : "Informations générales@Type de peuplement cible", "type" : "String", "readOnly":true},
					"observations" : { "title" : "Informations générales@Observations", "type" : "String", "readOnly":true},
					"structure" : { "title" : "Informations générales@Répartition par classe de diamètre", "type" : "String", "readOnly":true},
					"qualite" : { "title" : "Informations générales@Qualitatif", "type" : "String", "readOnly":true},
					"surface_terriere" : { "title" : "Informations générales@Surface terrière", "type" : "String", "readOnly":true},
					"interventions_psg" : { "title" : "Interventions@intervention", "type" : "JSON", "readOnly":true},
					/**/
				};
				//
				l.authentication = function(layer, cback) {
					var content = CordovApp.template("dialog-authenticate");
					$('span', content).text(layer.get('name'));
					wapp.dialog.show (content, {
						title: "Connexion", 
						buttons: { submit:"OK", cancel:"Annuler" },
						callback: function(b) {
							if (b=='submit') {
								cback($('.nom', content).val(), $('.pwd', content).val());
							}
							else {
								cback(false);
							}
						}
					});
				};
				// Gestion du cache
				var cache = {
					saveCache: function(response, extent, resolution) {
						var fileName = 'FILE/cache/'+this.getCacheFileName(extent, resolution); 
						CordovApp.File.getDirectory('FILE/cache', 
							function() {
								CordovApp.File.write(
									fileName, 
									response,
									options.success,
									options.error
								);
							}, 
							function(){},
							true
						);
					},
					loadCache: function(options) {
						if (wapp.param.options.nocache) {
							options.error('nocache');
							console.log("NOCACHE");
							return;
						}
						var fileName = 'FILE/cache/'+this.getCacheFileName(options.extent, options.resolution);
						CordovApp.File.info(
							fileName, 
							function(file){
								// Obsolete (plus d'un jour)
								if ((new Date() - file.lastModified) > 24*3600*1000 ) {
									options.error('obsolete');
								} else {
									// Lire le cache
									CordovApp.File.read(
										fileName, 
										options.success,
										options.error
									);
								}
							},
							function() {
								options.error('nocache');
							}
						);
					}
				};
				// Layer a charger
				vector = new ol.layer.Vector.WFS (l, cache);
				
				// Menage
				delete l.strategy;
				delete l.authentication;

				//
				vector.set('logo', groupe.logo);
				vector.set('attach', l.attach);
				// Chargement OK
				vector.once('ready', function() { 
					// Sauvegarde login / pwd
					wapp.ripart.saveParam();
					// Recherche sur la couche ?
					wapp.setSearchSource(this.getSource(), this.get('search'));
				}, vector);
				// Probleme au chargement
				vector.on("error", function(e){});
			} 
			// Guichet
			else {
				var url = l.url.replace(/(.*)\?(.*)/,"$1");
				var base = l.url.replace(/.*databasename=(.*)/,"$1");
				var extent = [];
				for (var k=0; k<l.extent.length; k++) extent[k] = parseFloat(l.extent[k]);
				extent = ol.proj.transformExtent(extent, 'EPSG:4326', wapp.map.getView().getProjection());
				vector = new ol.layer.Vector.Webpart(
					{	url: url,
						name: l.nom,
						title: l.nom,
						database: base,
						extent: extent,
						username: wapp.ripart.getUser(),
						password: wapp.ripart.getUser(true),
						// style: guichet.style,
						maxResolution: 40, // zoom 13
						checkSourceOptions: function (options, featureType)
						{	// Limiter la taille des tuilles en fonction du minZoom
							options.tileZoom = Math.max(featureType.minZoomLevel-2, 4);
						}
					},
					{	// preserved: select.getFeatures(),
						filter: (base=="bduni_metropole" ? {detruit:false} : {}),
						// Tile zoom to calculate tiles
						tileZoom: 13,
						maxFeatures: 5000,
						maxReload: wapp.param.options.maxReload || 10000
					});
			}	
			this.vector.push(vector);
			// Probleme au chargement
			vector.on("error", function(e){
				if (e.status===401)
				{	wapp.message ("Impossible de charger la couche <i>"
							+(this.get('name')||this.get('title'))
							+"</i>.<i class='error'><br/>"+e.status+" - "+e.error+"</i>",
							"Connexion", { ok:"ok" });
				}
				else
				{	wapp.alert ("Impossible de charger la couche <i>"
							+(this.get('name')||this.get('title'))
							+"</i>.<i class='error'><br/>"+e.status+" - "+e.error+"</i>");
				}
				return;
			});
			vector.on("ready", function(){
				// Marquer le layer sur l'objet
				this.getSource().on('addfeature', function (e) 
				{	e.feature.layer = this; 
				}, this);
				// Ooops probleme d'overload
				this.getSource().on('overload', function (e) 
				{	wapp.notification("overloading...");
				});
				// Notification de chargement
				this.getSource().on(['loadstart', 'loadend'], function (e) 
				{	loading[e.target.getFeatureType().fullName] = e.remains;
					var remains=0;
					for (var i in loading) remains += loading[i];
					if (remains)
					{	wapp.notification("<i class='blinking'>chargement...</i>", 5000, true);
					}
					else wapp.notification();
				});
				// Decompte
				nbLoad++;
				if (nb==nbLoad) wapp.notification(nb+" couches ajoutées à la carte...");
			});
			if (this.param.hidden) for (var k=0; k<this.param.hidden.length; k++)
			{	if (vector.get("name") == this.param.hidden[k]) 
				{	vector.setVisible(false);
					break;
				}
			}
			guichet.getLayers().push(vector);
		}
	}
	// Mettre les signalements en haut de la pile de calque
	if (nb) 
	{	wapp.map.removeLayer(wapp.ripart.layer);
		wapp.map.addLayer(wapp.ripart.layer);
		wapp.notification("Chargement des guichets...");
	}
};

/** Afficher la selection dans la barre et la fiche
*/
wapp.onSelect = function(e)
{	var f = e ? e.selected[0] : null;
	// wapp.ripart.cancelFormulaire();
	if (f)
	{	$("#selection").html (f.get("nom")||"Afficher la sélection...");
		wapp.showOnglet("info");
	}
	else
	{	$("#selection").html ("");//("<i>"+$("#selection").data("placeholder")+"</i>");
		//wapp.showOnglet("signal");
	}
	if (wapp.isPage("fiche")) wapp.showSelect();
};

/** Envoyer le signalements courant
*/
wapp.postGeorem = function()
{	var f = wapp.select.getFeatures().item(0);
	var grem = f.get('georem');
	wapp.select.selectFeature();
	if (grem) wapp.ripart.postLocalRem (grem, 
		{	cback: function(prem) 
				{	f = wapp.ripart.getFeature(prem);
					wapp.select.selectFeature(f, wapp.ripart.layer);
					wapp.wait(false)
				},
			error: function()
				{	wapp.select.selectFeature(f, wapp.ripart.layer);
				}
		});
};

/** Modifier le signalements courant
*/
wapp.modifyGeorem = function()
{	var f = wapp.select.getFeatures().item(0);
	var grem = f.get('georem');
	wapp.select.selectFeature();
	if (grem) wapp.ripart.showFormulaire (grem);
};

/** Supprimer le signalement courant
*/
wapp.delGeorem = function()
{	var f = wapp.select.getFeatures().item(0);
	var grem = f.get('georem');
	if (grem)
	{	wapp.select.getFeatures().clear();
		wapp.ripart.delLocalRem (grem);
		wapp.showSelect();
	}
}


/* Add attribute line to the selection list
* @param {} th container
* @param {} ul the list
* @param {string} title
* @param {string} val
*/
function _addLine(th, ul, title, val, type) {
	var theme, label;
	var index = title.indexOf('@');
	if (index > -1) {
		theme = title.substring(0, index);
		label = title.substring(index+1);
	} else {
		theme = "hidden";
		label = title;
	}
	// Hidden themes
//	if (theme==='symb') return;
	// Add new theme
	var className = theme.replace(/ /g,'_');
	if (theme && !$('.'+className, th).length) {
		$('<div>').addClass(className)
			.text(theme)
			.click(function(){
				$('div', th).removeClass('selected');
				$('.'+className, th).addClass('selected');
				$('li', ul).hide();
				$('.'+className, ul).show();
			})
			.appendTo(th);
	}
	// Add line
	var li = $("<li>").addClass(className).appendTo(ul);
	switch (type) {
		case 'JSON':
		case 'JsonValue':
			// Json decode
			var json;
			try { json = JSON.parse (val); }
			catch(e){};
			// Array
			if (json instanceof Array && json.length) {
				var tab = $("<table>").appendTo(li);
				var tr = $("<tr>").appendTo(tab);
				for (var k in json[0]) {
					$("<td>").text(k.replace(/_/g,' ')).appendTo(tr);
				}
				for (var i=0; i<json.length; i++) {
					tr = $("<tr>").appendTo(tab);
					for (var k in json[i]) {
						$("<td>").text(json[i][k])
							.addClass(typeof(json[i][k]))
							.appendTo(tr);
					}
				}
				break;
			}
		default:
			$("<label>")
				.text(label)
				.appendTo(li);
			$("<span>").text(val)
				.appendTo(li);
		break;
	}
};

/** Afficher la fiche
* @param {bool} ripart true si vient de la page de remontees 
*/
wapp.showSelect = function(ripart)
{	var f = this.select.getFeatures().item(0);

	if (ripart) $("#fiche").addClass("fromRipart");
	else $("#fiche").removeClass("fromRipart");

	var div = $('#fiche .selection').removeClass("georem fiche trace");
	// Pas de selection
	if (f) 
	{	var prop = f.getProperties();
		// Georem
		if (prop.georem)
		{	div.addClass("georem").removeClass("fiche");
			if (prop.georem.sketch) prop.georem.nb = wapp.ripart.sketch2feature(prop.georem.sketch).length;
			else prop.georem.nb = 0;
			wapp.dataAttributes($(".georem", div), prop.georem);
		}
		// Objet utilisateur
		else 
		{	div.addClass("fiche");
			// Trace GPS
			if (f.layer.get('geolocation')) div.addClass("trace");
			var prop = f.getProperties();
			$(".fiche h3 span", div).text(f.layer.get("title")||f.layer.get("name"));
			if (f.layer.get("logo")) {
				$(".fiche img.guichet", div).attr('src', f.layer.get("logo")).show();
			} else {
				$(".fiche img.guichet", div).hide();
			}
			var saveTheme =  $(".fiche .themes .selected", div).removeClass('selected').attr('class');
			var ul = $(".fiche ul", div).html('');
			var th = $(".fiche .themes", div).html("");
			// Trace GPS
			if (f.layer.get('geolocation')) div.addClass("trace");
			// Objet d'un guichet
			else if (f.layer instanceof ol.layer.Vector.Webpart)
			{	var ftype = f.layer.getSource().featureType_;
				for (i in ftype.attributes) if (i!=ftype.geometryName && f.get(i))
				{	var att = ftype.attributes[i];
					switch (att.type)
					{	case "Point":
						case "LineString":
						case "Polygon":
						case "MultiPolygon":
							break;
						default:
						{	_addLine(th, ul, att.title, f.get(i), att.type);
						}
					}
				}
			}
			// Objet WMS
			else if (f.layer.get("getFeatureInfoMask"))
			{	var visu = f.layer.get("getFeatureInfoMask").visu;
				for (i in visu) 
				{	_addLine(th, ul, visu[i].replace(/_/g,' '), f.get(i));
				}
			}
			// Objet WFS
			else 
			{	var prop = f.getProperties();
				var geometryName = f.getGeometryName();
				var att = f.layer.getFeatureType().attributes || {};
				for (i in prop) if (i !== geometryName) {
					_addLine(th, ul, (att[i]?att[i].title:i).replace(/_/g,' '), f.get(i), att[i]?att[i].type:'string');
				}
			}
			// select first theme
			if (saveTheme) $("."+saveTheme, th).click();
			else $(th.children()[0]).click();
		}
	}
	wapp.showPage("fiche");
	// Afficher le point si hors de l'ecran
	if (f)
	{	var e = this.map.getView().calculateExtent(this.map.getSize());
		if (!ol.extent.containsCoordinate(e, f.getGeometry().getFirstCoordinate()))
		{	this.map.getView().setCenter(f.getGeometry().getFirstCoordinate());
		}
	}
};

/** Connexion RIpart
*/
wapp.connect = function()
{	wapp.ripart.connectDialog(
	{	onConnect: function()
		{	wapp.initGuichets();
		},
		onError: function(error)
		{	var msg = [];
			switch (error.status)
			{	case 401: 
					msg = [ "Accès interdit" , "Utilisateur inconnu." ];
					break;
				case "no_profile":
					msg = [ "Connexion", error.statusText ]
					break;
				default: 
					msg = [ "Connexion", "Connexion impossible...<br/>Vérifiez votre connexion." ];
					console.log(error)
					break;
			};
			wapp.message (msg[1], msg[0], 
				{ ok:"ok" },
				function()
				{	wapp.connect();
				});
		}
	});
};

/** Afficher le formulaire de signalement
*/
wapp.showRipartForm = function()
{	wapp.showOnglet("signal");
	wapp.showPage("fiche");
};

/** Preparer les champs de la fiche au chargement du layer
* /
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

	console.log("TODO : cartes info");
	return;
/*
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
*/
});

/** Mettre a jour la carte
*/
$("#fiche").on("showpage hidepage", function(e)
{	wapp.map.updateSize();
});

/**
 * Affichage de la maitenance
 */
wapp.maintain = function() {
  // Info
	var freeDiskSpace = 0;
	var cacheImage = {};
  var cacheVecteur = {};

  // Affichage des infos (en asynchrone)
  var count = 0;
  function countCache(cache, className) {
    var ul = $("#maintenance .resume");
    var s = 0;
    for (var i in cache) {
      var c = cache[i];
      s += c.size;
      $("<li>").append($('<p>').addClass('title').text(i))
        .append($('<p>').text(c.nb+' fichiers - '+(c.size/1024/1024).toFixed(2)+' Mo'))
        .appendTo(ul);
    }
    $("#maintenance .info span."+className).text((s/1024/1024).toFixed(2));
    return s;
  }
	function show(async) {
    if (async) {
      count--;
      if (!count) {
        console.log(freeDiskSpace, cacheImage, cacheVecteur);
        $("#maintenance .info span.diskspace").text((freeDiskSpace/1024/1024).toFixed(1));
        $("#maintenance .resume").html('');
        var total = countCache(cacheImage, 'cimage') 
                  + countCache(cacheVecteur, 'cvector');
        total /= 1024;
        if (total) {
          var n = total / (total + freeDiskSpace) * 360;
          console.log(n, total, freeDiskSpace)
          if (total/1024/1024 > .5) $("#maintenance .pie p").text((total/1024/1024).toFixed(1)+' Go');
          else $("#maintenance .pie p").text((total/1024).toFixed(1)+' Mo');
          if (n<180) {
            $("#maintenance .pie .sector50").hide();
            $("#maintenance .pie .sector").css({ transform: "rotate(-180deg)" });
            $("#maintenance .pie .sector > div").css({ transform: "rotate("+(180+n)+"deg)" });
          } else {
            $("#maintenance .pie .sector50").show();
            $("#maintenance .pie .sector").css({ transform: "rotate("+(n-360)+"deg)" });
            $("#maintenance .pie .sector > div").css({ transform: "rotate(0deg)" });
          }
        } 
      }
    } else {
      count++;
      setTimeout(function(){ show(true); }, 200);
    }
    return;
  }
  
  // Espcae libre
	CordovApp.File.getFreeDiskSpace(function (s){
		freeDiskSpace = s;
		show();
  });

  // Calcul du cache
  function getCache(d, cache) {
    CordovApp.File.listDirectory("FILE/"+d.fullPath,
      function(l2) {
        cache[d.name] = { nb:0, size:0 };
        for (var i=0, f; f=l2[i]; i++) {
          CordovApp.File.info("FILE/"+f.fullPath, function(f){
            cache[d.name].nb++;
            cache[d.name].size += f.size;
            show();
          });
        }
      }
    );
  };
  // Cache geoportail
	CordovApp.File.listDirectory("FILE/geoportail",
		function(l) {
			for (var i=0, d; d=l[i]; i++) {
        getCache(d, cacheImage);
			}
		}
  );
  // Cache vecteur
	CordovApp.File.listDirectory("FILE/cache",
		function(l) {
			for (var i=0, d; d=l[i]; i++) {
        getCache(d, cacheVecteur);
			}
		}
	);
};

})();
