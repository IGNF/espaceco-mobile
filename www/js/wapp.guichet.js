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
	{	// Guichet courant
		if (this.ripart.param.guichet == g.id_groupe) current = g;
		// Affichage si WFS
		var couches = "";
		for (var j=0; j<g.layers.length; j++) 
		{	if (g.layers[j].type=="WFS") couches += (couches?", ":"")+g.layers[j].nom;
		}
		if (couches)
		{	$('#cartes [data-list="guichets"] ul.nomap').hide();
			var li = $("<li>")
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
			$("<img>").attr("src",g.logo)
				.prependTo(li);
		}
		else
		{	$('#cartes [data-list="guichets"] ul.nomap').show();
		}
	}
	wapp.setGuichet(current);
};

/** Guichet en cours de modification
*/
wapp.setGuichet = function(groupe)
{	if (!groupe) groupe = {};
	// Nouveau guichet
	this.ripart.param.guichet = groupe.id_groupe;
	wapp.ripart.saveParam();
	// Mettre a jour la liste
	$('#cartes [data-list="guichets"] ul.guichet li').each(function()
	{	if ($(this).data('groupe')===groupe) $(this).addClass('selected');
		else $(this).removeClass('selected');
	});
	// Layers du guichet
	if (this.vector) 
	{	for (var i=0, l; l=this.vector[i]; i++) 
			this.map.removeLayer(l);
	}
	this.vector = [];
	if (!groupe.layers) return;
	var nb=0, nbLoad=0;
	var loading={};
	// Ajouter les layers Webpart
	for (var i=0, l; l=groupe.layers[i]; i++)
	{	if (l.type=="WFS")
		{	nb++;
			var url = l.url.replace(/(.*)\?(.*)/,"$1");
			var base = l.url.replace(/.*databasename=(.*)/,"$1");
			var vector = new ol.layer.Vector.Webpart(
			{	url: url,
				name: l.nom,
				database: base,
				username: wapp.ripart.getUser(),
				password: wapp.ripart.getUser(true),
				// style: guichet.style,
				maxResolution: 40, // zoom 13
				checkSourceOptions: function (options, featureType)
				{	// Limiter la taille des tuilles en fonction du minZoom
					if (featureType.minZoomLevel) options.tileZoom = Math.max(featureType.minZoomLevel-2, 13);
					// Eviter un affichage en zoom 0
					else featureType.minZoomLevel = 12;
				}
			},
			{	// preserved: select.getFeatures(),
				filter: (base=="bduni_metropole" ? {detruit:false} : {}),
				// Tile zoom to calculate tiles
				tileZoom: 13,
				maxFeatures: 5000,
				maxReload: wapp.param.options.maxReload || 10000
			});
			this.vector.push(vector);
			// Probleme au chargement
			vector.on("error", function(e)
			{	if (e.status===401)
				{	wapp.message ("Impossible de charger la couche."
							+"<i class='error'><br/>"+e.status+" - "+e.error+"</i>",
							"Connexion", { ok:"ok" });
				}
				else
				{	wapp.alert ("Impossible de charger la couche."
							+"<i class='error'><br/>"+e.status+" - "+e.error+"</i>");
				}
				return;
			});
			vector.on("ready", function()
			{	// Marquer le layer sur l'objet
				this.getSource().on('addfeature', function (e) 
				{	e.feature.layer = this; 
				}, this);
				// Ooops probleme d'overload
				this.getSource().on('overload', function (e) 
				{	wapp.notification("loading overload...");
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
			this.map.addLayer(vector);
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
			wapp.dataAttributes($(".georem", div), prop.georem);
		}
		// Objet du guichet
		else 
		{	div.addClass("fiche");
			if (f.layer.get('geolocation')) div.addClass("trace");
			var prop = f.getProperties();
			$(".fiche h3 span", div).text(f.layer.get("title")||f.layer.get("name"));
			var ul = $(".fiche ul", div).html("");
			var ftype = f.layer.getSource().featureType_;
			if (ftype)
			{	for (i in ftype.attributes) if (ftype.attributes.hasOwnProperty(i) && i!=ftype.geometryName)
				{	var att = ftype.attributes[i];
					switch (att.type)
					{	case "Point":
						case "LineString":
						case "Polygon":
						case "MultiPolygon":
							break;
						default:
						{	var li = $("<li>").appendTo(ul);
							$("<label>").text(att.title)
								.appendTo(li);
							$("<span>").text(f.get(i))
								.appendTo(li);
						}
					}
				}
			}
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

})();
