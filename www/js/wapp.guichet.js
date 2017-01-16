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

/** Afficher la fiche
*/
wapp.showSelect = function()
{	var f = this.select.getFeatures().item(0);
	var div = $('#fiche .selection');
	if (!f) 
	{	div.removeClass("georem fiche");
		this.currentProperties = null;
	}
	else
	{	var prop = f.getProperties();
		// Georem
		if (prop.georem)
		{	div.addClass("georem");
			this.currentProperties = null;
			wapp.dataAttributes($(".georem", div), prop.georem);
		}
		// Objet du guichet
		else 
		{	div.addClass("fiche");
			this.currentProperties = wapp.setParamInput($(".fiche ul", div), prop);
		}
	}
	wapp.showPage("fiche");
};

/** Afficher le formulaire de signalement
*/
wapp.showRipartForm = function()
{	wapp.showOnglet("signal");
	wapp.showPage("fiche");
};

/** Valider la fiche courante
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

/** Mettre a jour la carte
*/
$("#fiche").on("showpage hidepage", function(e)
{	wapp.map.updateSize();
});

})();
