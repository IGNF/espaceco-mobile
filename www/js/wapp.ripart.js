/** Creation du compte > enregistrer les actions

options:
- infoElement : element pour l'info de connection : '#options .connect [data-input-role="info"] span.info'
- formElement : formulaire de saisie d'une remontee : '#fiche2 [data-role="onglet-li"][data-list="signal"]'
- countElement : compteur de remontees locale : '.georemsCount span'
- listElement : ul pour l'affichage de la liste des remontees (doit contenir un template) : #signalements [data-role="content"]
- profilElement : Affichage du profil de contribution : .profil
- georemPage : Page d'affichage de la remontee : #georem
- onSelect {function} : selectionne une georem
- onShow {function} afficher le formulaire
- onLocate {function} callback lors d'une localisation
- formatGeorem {function} formater une georem avant envoi, recoit un georem + formulaire, renvoi true si ok pour la sauvegarde
- messagePhoto {String} Message pour la prise de photo (text/html)
*/
RIPart.prototype.initialize = function(options)
{	var self = this;

	// Parametres
	this.messagePhoto = $(options.messagePhoto);

	// List
	this.infoElement = $(options.infoElement);
	this.formElement = $(options.formElement);
	this.countElement = $(options.countElement);
	this.listElement = $(options.listElement);
	this.listElementTemplate = $('[data-role="template"]', options.listElement).html();
	this.profilElement = $(options.profilElement || ".profil");
	this.georemPage = $(options.georemPage || '#georem');

	// Champs preremplis
	this.onSelect = options.onSelect || function(){};
	this.onShow = options.onShow || function(){};
	this.onLocate = options.onLocate || function(){};
	this.formatGeorem = options.formatGeorem || function(){ return true; };

	// Recuperation de l'utilisateur
	if (this.param.user) this.setUser (this.param.user, this.param.pwd);

	// Overlay
	this.overlay = new ol.layer.Vector(
		{	source: new ol.source.Vector({ features: new ol.Collection() }), 
			visible: false,
			style: [
				new ol.style.Style(
				{	image: new ol.style.Circle({ stroke: new ol.style.Stroke({ color:[255,255,255, 0.5], width:6 }), radius:15 }),
					snapToPixel: true
				}),
				new ol.style.Style(
				{	image: new ol.style.Circle({ stroke: new ol.style.Stroke({ color:[0, 153, 255, 1], width:3 }), radius:15 }),
					snapToPixel: true
				})]
		});
	this.overlay.setMap(wapp.map);

	// layer
	if (options.layer) 
	{	this.layer = options.layer;
		wapp.map.addLayer(this.layer);
		// Style
		var symb = {	glyph: "fa-circle", 
						form: "poi", 
						fill: new ol.style.Fill({ color:[255,255,255, 1] }), 
						stroke: new ol.style.Stroke( { color: "#fff", width:1.5 } ), 
						radius: 18,
						offsetY: -18
					};
		var style = 
		{	"submit": new ol.style.Style(
				{	image: new ol.style.FontSymbol(
						$.extend (symb, 
						{	stroke: new ol.style.Stroke({ color:[80,80,80, 1], width:1.5  }) 
						})
					)
				}),
			"pending": new ol.style.Style(
				{	image: new ol.style.FontSymbol(
						$.extend (symb, { stroke: new ol.style.Stroke({ color:[242, 157,0, 1], width:1.5  }) })
					)
				}),
			"valid": new ol.style.Style(
				{	image: new ol.style.FontSymbol(
						$.extend (symb, { stroke: new ol.style.Stroke({ color:[0,128,0, 1], width:1.5  }) })
					)
				}),
			"reject": new ol.style.Style(
				{	image: new ol.style.FontSymbol(
						$.extend (symb, { stroke: new ol.style.Stroke({ color:[192,0,0, 1], width:1.5  }) })
					)
				}),
		};
		for (var i in style) 
		{	style[i]= [ 
				new ol.style.Style( 
				{	image: new ol.style.Shadow( { radius:12 } ) 
				}),
				style[i] ];
		}
		style.pending0 = style.pending;
		style.pending1 = style.pending;
		style.pending2 = style.pending;
		style.valid0 = style.valid;
		style.reject0 = style.reject;
		this.layer.setStyle (function(f,res)
		{	return style[f.get("georem").statut] || style.submit ;
		});
	}

	// Gestion du GPS
	this.geolocation = new ol.Geolocation(/** @type {olx.GeolocationOptions} */ 
	({	projection: "EPSG:4326", //wapp.map.getView().getProjection(),
		trackingOptions: 
		{	maximumAge: 10000,
			enableHighAccuracy: true,
			timeout: 600000
		}
	}));
	this.geolocation.on('change', function(e) 
		{	this.hasLocation = true; 
			if (typeof (this.onLocate) =="function") 
			{	this.onLocate.call (this,
					{	position: this.geolocation.getPosition(),
						accuracy: this.geolocation.getAccuracy(),
						// accuracyGeometry: this.geolocation.getAccuracyGeometry(),
						altitude: this.geolocation.getAltitude(),
						altitudeAccuracy: this.geolocation.getAltitudeAccuracy(),
						heading: this.geolocation.getHeading() || 0,
						speed: this.geolocation.getSpeed() || 0
					});
			}
		}, this);
	this.hasLocation = false;

	// Gestion du formulaire de signalement
	var formulaire = this.formElement;
	$('.formulaire .cancel', formulaire).click(function()
	{	self.cancelFormulaire(false);
	});

	// Tracking du centre
	this.target = new ol.control.Target({ visible: false });
	wapp.map.addControl (this.target);
	this.showFormulaire(false);

	$('.trackingInfo', formulaire.parent()).click(function()
	{	self.target.setVisible(false);
		$('body').removeClass("trackingGeorem");
	});
	$('.formulaire .movePosition', formulaire).click(function()
	{	wapp.help.show("signaler-carte");
		var track = !self.target.getVisible();
		if (track) 
		{	$('body').addClass("trackingGeorem");
			var lon = Number($("input.lon", formulaire).val());
			var lat = Number($("input.lat", formulaire).val());
			wapp.map.getView().setCenterAtLonlat([ lon, lat ]);
			self.modifyInteraction.setActive(true);
		}
		else 
		{	$('body').removeClass("trackingGeorem");
			self.modifyInteraction.setActive(false);
		}
		self.target.setVisible(track);
	});
	wapp.map.getView().on("change:center", function()
	{	if (this.target.getVisible())
		{	var pos = wapp.map.getView().getCenter();
			self.overlay.getSource().clear();
			self.overlay.getSource().addFeature( new ol.Feature (new ol.geom.Point(pos)));
			self.overlay.setVisible(true);
			pos = ol.proj.transform(pos, wapp.map.getView().getProjection(),'EPSG:4326');
			$("input.lon", formulaire).val(pos[0].toFixed(8));
			$("input.lat", formulaire).val(pos[1].toFixed(8));
		}
	}, this);

	// Outil de deplacement de la remontee
	this.modifyInteraction = new ol.interaction.Modify(
		{	features: this.overlay.getSource().getFeaturesCollection(),
		});
	this.modifyInteraction.on("modifyend", function(e)
	{	var p = e.features.item(0).getGeometry().getFirstCoordinate()
		wapp.map.getView().setCenter(p);
	});
	this.modifyInteraction.setActive(false);
	wapp.map.addInteraction(this.modifyInteraction);

	// Enregistement d'une remontee
	$('.formulaire .save', formulaire).click(function(){ self.saveFormulaire ($(this).closest(".formulaire")); });
	this.onUpdate();

	// Affichage des remontees
	this.georemPage.on("showpage", function() 
	{	wapp.map.updateSize(); 
		// Enpecher les actions sur la carte
		wapp.disableCtrl.disableMap(true);
	});
	this.georemPage.on("hidepage", function() 
	{	setTimeout ( function ()
		{	wapp.showPage('signalements'); 
			wapp.map.updateSize();
			wapp.disableCtrl.disableMap(false);
		}, 100);
	});
				
};


/** delete a local rem
* @param {Object} the rem to save
* @param {function} a callback function
*/
RIPart.prototype.delLocalRem = function(i, options)
{	// Chercher l'indice correspondant a une remontee
	if (typeof(i) != 'number')
	{	for (var k=0; k<this.param.georems.length; k++)
		{	if (this.param.georems[k] === i)
			{	i = k;
				break;
			}
		}
	}

	var grem = this.param.georems[i];
	if (grem)
	{	// Supprimer
		this.param.georems.splice(i,1);
		// Supprimer la photo correspondante
		if (grem.photo)
		{	CordovApp.File.delFile (grem.photo);
		}
		// remove feature from layer
		var f = this.getFeature(grem);
		if (f) this.layer.getSource().removeFeature(f);
		this.saveParam();
		this.onUpdate();
	}

}

/** Sauvegarde de la remontee depuis le formulaire
*/
RIPart.prototype.saveFormulaire = function(form)
{	var self = this;
	
	// Preformatage
	var georem = 
	{	lon: Number($("input.lon", form).val()), 
		lat: Number($("input.lat", form).val()), 
		sketch: undefined,
		comment: $(".comment", form).val(),
		photo: $('.photo img', form).data('photo') || false
	}
	if (this.hasLocation)
	{	var pos = this.geolocation.getPosition();
		georem.plon = pos[0];
		georem.plat = pos[1];
		georem.accuracy = this.geolocation.getAccuracy();
	}
	var theme = wapp.selectInputVal($('[data-input="select"][data-param="theme"]', this.formElement));
	if (theme)
	{	georem.themes = '"'+theme+'"=>"1"';
		georem.theme = wapp.selectInputText($('[data-input="select"][data-param="theme"]', this.formElement));
	}
	georem.id_groupe = this.param.profil.id_groupe;

	// Formatage utilisateur
	var isok = this.formatGeorem.call (this, georem, form);

	if (isNaN(georem.lon) || isNaN(georem.lat))
	{	isok = false;
		wapp.alert ("aucune coordonnée...");
	}

	if (isok)
	{	// Forcer la date au moment de la remontee
		georem.date = (new Date()).toISOString().replace(/T|(\..*)/g,' ');

		// Ajouter la remontee
		wapp.wait("Enregistrement de la remontée");
		this.saveLocalRem (georem, function(e)
		{	wapp.wait(false);
			wapp.notification (e.info);
			// Reset photo
			$(".photo img", self.formElement).attr("src","")
						.data("photo",false)
						.hide();
			$(".photo .fa-stack", self.formElement).show();
			$(".comment", form).val("");
		})
		this.cancelFormulaire();
	}
};

/** Save a new local rem
* @param {Object} the rem to save
* @param {function} a callback function
*/
RIPart.prototype.saveLocalRem = function(georem, cback)
{	var self = this;
	this.param.nbrem++;
	this.param.georems.push(georem);
	// Sauvegarde de la photo
	if (georem.photo)
	{	CordovApp.File.moveFile (georem.photo, "TMP/georem-"+this.param.nbrem+".jpg", 
			function(file)
			{	georem.photo = file.toURL();
				self.saveParam();
				if (cback) cback ({ error:false, info:"La remontée a été enregistrée." });
			},
			function()
			{	georem.photo = false;
				self.saveParam();
				self.onUpdate();
				if (cback) cback ({ error:'NOPHOTO', info:"Photo introuvable..." });
			})
	}
	else 
	{	this.saveParam();
		if (cback) cback ({ error:false, info:"La remontée a été enregistrée." });
	}
	this.onUpdate();
}

/** Get the local rems
*/
RIPart.prototype.getLocalRems = function()
{	return this.param.georems;
}

/** Post local rems to server
*/
RIPart.prototype.postLocalRems = function()
{	var self = this;
	var nb = this.countLocalRems();
	var n = 0;

	function postNext()
	{	var p = self.countLocalRems();
		// Ended ?
		if (!p) 
		{	wapp.wait(false);
			return;
		}
		// Send next
		for (var i=0; i<self.param.georems.length; i++)
		{	var grem = self.param.georems[i];
			if (!grem.id)
			{	n++;
				self.postLocalRem (i, { info: "Envoi des remontées ("+n+"/"+nb+")", cback: postNext });
				break;
			}
		}
	}

	// Start sending...
	if (nb) postNext();
	else wapp.message ("Toutes les remarques ont déjà été envoyées..."," ");
};


/** Post local rem to server
*/
RIPart.prototype.postLocalRem = function(i, options)
{	var self = this;
	if (!options) options = {};

	// Si i n'est pas un indice, c'est une remontee => chercher son indice
	if (typeof(i) != 'number')
	{	for (var k=0; k<self.param.georems.length; k++)
		{	if (self.param.georems[k] === i)
			{	i = k;
				break;
			}
		}
	}
	// Envoyer la ieme
	var grem = self.param.georems[i];
	if (grem && !grem.id)
	{	wapp.wait(options.info || "Envoi en cours...");
		self.postGeorem ( grem, function(resp,e)
		{	if (e)
			{	wapp.wait(false);
				var msg = "Impossible d'envoyer la remontée.<br/>";
				if (e.status===401) 
				{	msg += "Vous devez être connecté...";
				}
				else
				{	msg += "Vérifiez votre connexion.";
						+"<i class='error'><br/>Erreur : "+e.status+" - "+e.statusText+"</i>";
				}
				wapp.message ( msg, "Connexion", 
						{ ok:"ok", connect: (e.status===401) ? "Se connecter...":undefined },
						function(b)
						{	if (b=="connect") self.connectDialog();
						});
				// Post Next
				if (typeof(options.error)=='function') options.error();
				self.saveParam();
				self.onUpdate();
			}
			else
			{	wapp.notification ("Remontée envoyée au serveur ("+resp.id+").");
				self.param.georems[i] = resp;
				if (grem.photo) self.param.georems[i].photo = grem.photo;
				self.updateLayer();
				// Post Next
				if (typeof(options.cback)=='function') options.cback(resp);
				else wapp.wait(false);
				self.saveParam();
				self.onUpdate();
			}
		});
	}
};

/** Nombre de georems en attente
*/
RIPart.prototype.countLocalRems = function()
{	var c = 0;
	for (var i=0; i<this.param.georems.length; i++)
	{	if (!this.param.georems[i].id) c++;
	}
	return c;
};

/** Mettre a jour les remontees
*/
RIPart.prototype.updateLocalRems = function()
{	var self = this;
	var n = 0;
	var nb = self.param.georems.length;

	function next()
	{	// Send next
		for (var i=n; i<self.param.georems.length; i++)
		{	var grem = self.param.georems[i];
			n++;
			if (grem.id)
			{	self.updateLocalRem (i, { info: "Mise à jour ("+n+"/"+nb+")", cback: next });
				break;
			}
		}
		// Ended ?
		if (n == self.param.georems.length) 
		{	wapp.wait(false);
			wapp.notification("Opération terminée.");
			return;
		}
	}

	// Start...
	next();
};

/** Mettre a jour une remontee
*/
RIPart.prototype.updateLocalRem = function(i, options)
{	var self = this;
	if (!options) options = {};
	
	// Chercher l'indice correspondant a une remontee
	if (typeof(i) != 'number')
	{	for (var k=0; k<this.param.georems.length; k++)
		{	if (this.param.georems[k] === i)
			{	i = k;
				break;
			}
		}
	}

	var grem = this.param.georems[i];
	if (grem && grem.id)
	{	wapp.wait(options.info || "Opération en cours...");
		self.getGeorem (grem.id, function(resp, e)
		{	if (e)
			{	wapp.wait(false);
				wapp.message ("Impossible d'accéder à la remontée"
							+"<i class='error'><br/>Erreur : "+e.status+" - "+e.statusText+"</i>",
						"Connexion", 
						{ ok:"ok", connect: (e.status===401) ? "Se connecter...":undefined },
						function(b)
						{	if (b=="connect") wapp.ripart.connectDialog();
						});
				self.saveParam();
				self.onUpdate();
			}
			else
			{	// wapp.notification ("Remontée mise à jour ("+resp.id+").");
				self.param.georems[i] = resp;
				if (grem.photo) self.param.georems[i].photo = grem.photo;
				self.updateLayer();
				// Post Next
				if (typeof(options.cback)=='function') options.cback(resp);
				else wapp.wait(false);
				self.saveParam();
				self.onUpdate();
			}
		});
	}
};

/** Supprimer les remontees + dialogue de confirmation / type de réponse
*/
RIPart.prototype.delLocalRems = function()
{	var self = this;
	wapp.selectDialog (
			{	all: "Toutes les remontées envoyées", 
				rep: "Les remontées ayant eu une réponse",
				close: "Seulement les remontées closes"
			}, 
			"", 
			function(v)
			{	var mess;
				switch (v)
				{	case "all": mess = "Vous allez supprimer toutes les remontées envoyées.";
						break;
					case "rep": mess = "Vous allez supprimer toutes les remontées ayant eu au moins une réponse.";
						break;
					case "close": mess = "Vous allez supprimer toutes les remontées closes.";
						break;
				}
				wapp.message ( mess, "Suppression",
				{	ok: "confirmer",
					cancel: "annuler"
				},
				function (b)
				{	if (b=="ok")
					{	var n = 0;
						var t = { 
							submit:["submit"], 
							pending:["pending","pending0","pending1"], 
							close:["valid","valid0","reject","reject0"] 
						};
						t.rep = t.pending.concat(t.close);
						t.all = t.rep.concat(t.submit);
						for (var i=self.param.georems.length-1; i>=0; i--)
						{	var statut = self.param.georems[i].statut;
							if (statut && $.inArray(statut, t[v])>=0)
							{	self.delLocalRem(i);
							}
						}
					}
				});
			}, 
			{	title: "Supprimer...",
				confirm: true
			} 
		);
};


/** Afficher l'id de connexion dans les options
*/
RIPart.prototype.onUpdate = function()
{	var self = this;

	// Id connexion
	if (this.isConnected()) 
	{	this.infoElement
			.html(this.param.user+" / &#x25cf;&#x25cf;&#x25cf;&#x25cf;&#x25cf;")
			.parent().addClass("connected");
		this.formElement.addClass("connected");
	}
	else 
	{	this.infoElement.parent().removeClass("connected");
		this.formElement.removeClass("connected");
	}

	// Affichage des groupes
	var profil = this.param.profil || {};
	$("img", this.profilElement).attr("src", profil.logo || "");
	$(".title", this.profilElement).text(profil.titre || "");

	// Gestion de la liste des remontees
	var c = this.countLocalRems();
	this.countElement.text(c);
	if (c) this.countElement.parent().removeClass("hidden");
	else this.countElement.parent().addClass("hidden");

	// Affichage de la liste
	var ul = $('ul', this.listElement).html("");
	var grems = this.param.georems;
	if (!grems.length) $(".nogeorem", this.listElement).show();
	else
	{	$(".nogeorem", this.listElement).hide();
		for (var i=0; i<grems.length; i++)
		{	li = $('<li>').html(this.listElementTemplate)
				.addClass(grems[i].statut)
				.appendTo(ul)
				.data("grem", grems[i])
				// Show georem page
				.on ("click", function(e)
				{	self.georemShow($(this).data("grem"));
				});
			wapp.dataAttributes(li, grems[i]);
		}
	}
	this.updateLayer();
};

/** Get feature in the layer
*/
RIPart.prototype.getFeature = function(grem)
{	var f;
	if (this.layer)
	{	var features = this.layer.getSource().getFeatures();
		for (i=0; f=features[i]; i++)
		{	if (f.get('georem')===grem) break;
		}
	}
	return f;
};

/** Update layer according to grems
*/
RIPart.prototype.updateLayer = function()
{	if (this.layer)
	{	var source = this.layer.getSource();
		source.clear();
		var grems = this.param.georems;
		for (var i=0; i<grems.length; i++)
		{	source.addFeature( new ol.Feature (
				{	geometry: new ol.geom.Point( ol.proj.transform([grems[i].lon, grems[i].lat],'EPSG:4326', wapp.map.getView().getProjection()) ),
					georem: grems[i]
				}));
		}
	}
};

/** Afficher les info de la remontee
*/
RIPart.prototype.georemShow = function(grem)
{	var page = this.georemPage.data('grem', grem);
	wapp.showPage(this.georemPage.attr("id"));
	// Affichage
	wapp.dataAttributes(page, grem);
	/*
	// Gestion de la photo
	if (grem.photo) $(".photo", page).attr('src', grem.photo).show();
	else $(".photo", page).attr('src', "").hide();
	*/
	if (grem.id) 
	{	$(".send", page).hide();
	}
	else 
	{	$(".send", page).show();
	}
	// Centrer la carte
	wapp.map.getView().setCenterAtLonlat ([ grem.lon, grem.lat ]);
	// Select georem
	this.onSelect (grem);
};



/** Envoyer la remontee courante
*/
RIPart.prototype.postCurrentRem = function()
{	this.postLocalRem (this.georemPage.data('grem'));
};

/** Supprimer la remontée courante
*/
RIPart.prototype.delCurrentRem = function()
{	wapp.hidePage();
	this.delLocalRem (this.georemPage.data('grem'));
}

/** Dialog de connexion a l'espace collaboratif
* @param {} options
*	- onShow {function} a function called when the dialog is shown
*	- onQuit {function} a function called when the dialog is closed
*	- onError {function} a function called when an error occures
*/
RIPart.prototype.connectDialog = function (options)
{	var self = this;
	options = options || {};
	var tp = CordovApp.template('dialog-connectripart');
	var nom = $(".nom",tp);
	var pwd = $(".pwd",tp);
	wapp.dialog.show ( tp, 
		{	title:"Connexion", 
			classe: "connect", 
			buttons: { cancel:"Annuler", deconnect: "Déconnexion", connect:"Connexion"},
			callback: function(bt)
			{	if (bt == "connect")
				{	if (self.param.user != nom.val())
					{	self.param.profil = null;
					}
					self.param.user = nom.val();
					self.param.pwd = pwd.val();
					wapp.wait("Connection au serveur...");
					self.setUser (self.param.user, self.param.pwd);
					self.checkUserInfo (null, (typeof (options.onError) == "function") ? options.onError : null);
				}
				else if (bt=="deconnect")
				{	self.param.user = self.param.pwd = null;
					self.param.profil = null;
					self.saveParam();
				}
				if (typeof (options.onQuit) == "function") options.onQuit({ dialog:tp, target: this });
				self.onUpdate();
			}
		});
	nom.focus().val(this.param.user);
	pwd.val(this.param.pwd)
	if (typeof (options.onShow) == "function") options.onShow({ dialog:tp, target: this });
	self.saveParam();
};

/** Check user info : getUserInfo + save informations
*/
RIPart.prototype.checkUserInfo = function(success, fail)
{	var self = this;

	if (typeof(success) != "function")
	{	success = function()
		{	wapp.notification(_T("Connecté au service..."),"2s")
		}
	}
	if (typeof(fail) != "function")
	{	fail = function(error)
		{	switch (error.status)
			{	case 401: 
					wapp.alert ("Utilisateur inconnu.","Accès interdit");
					break;
				default: 
					wapp.alert (error.statusText);
					break;
			}
		}
	}

	this.getUserInfo (function(rep, error)
	{	wapp.wait(false);
		if (error)
		{	rep = {};
			// self.param.profil = null;
			fail(error);
		}
		else 
		{	self.param.profil = rep.profil;
			self.param.groupes = rep.groupes;
			self.param.themes = rep.themes;
			success(rep);
		}
		self.saveParam();
	});
};

/** On a deja une connexion
*/
RIPart.prototype.isConnected = function()
{	return (this.param && this.param.profil) ? true:false;
};

/** Gestion de la page de signalement
*/
RIPart.prototype.showFormulaire = function(b)
{	if (b===false)
	{	this.formElement.removeClass('formulaire');
		this.overlay.setVisible(false);
	}
	else
	{	wapp.help.show("formulaire-signaler");
		this.formElement.addClass('formulaire');
		$('.formulaire .movePosition', this.formElement).removeClass("tracking");
		this.onShow(this.formElement);
		
		var theme = $('[data-input="select"][data-param="theme"]', this.formElement);
		$('[data-input-role="option"]', theme).remove();
		$("<div>").attr("data-input-role","option").attr("data-val", "").html("<i>choisissez un thème...</i>").appendTo(theme);
		var valdef = false;
		var nbth = 0;
		for (var i=0; i<this.param.themes.length; i++)
		{	if (wapp.param.options.igntheme || this.param.themes[i].id_groupe == this.param.profil.id_groupe)
			{	$("<div>").attr("data-input-role","option")
					.attr("data-val", this.param.themes[i].id_groupe+"::"+this.param.themes[i].nom)
					.text(this.param.themes[i].nom)
					.appendTo(theme);
				if (valdef===false) valdef = this.param.themes[i].id_groupe+"::"+this.param.themes[i].nom;
				else valdef = "";
				nbth++;
			}
		}
		wapp.selectInput(theme, valdef);
		if (nbth) theme.show();
		else theme.hide();

		var lon = Number($("input.lon", this.formElement).val());
		var lat = Number($("input.lat", this.formElement).val());
		pos = ol.proj.transform([lon, lat], 'EPSG:4326', wapp.map.getView().getProjection());
		this.overlay.getSource().clear();
		this.overlay.getSource().addFeature( new ol.Feature (new ol.geom.Point(pos)));
		this.overlay.setVisible(true);
		wapp.map.getView().setCenter(pos);
	}
	this.target.setVisible(false);
	this.geolocation.setTracking (b!==false);
	this.hasLocation = false;
	$('body').removeClass("trackingGeorem");
};

/** Cancel formulaire: showFormulaire (false)
*/
RIPart.prototype.cancelFormulaire = function(b)
{	this.showFormulaire (false);
}

/** Take a photo using the camera
*/
RIPart.prototype.photo = function()
{	var self = this;
	var photoElt = $(".photo", this.formElement);
	wapp.getPicture(function(url, button)
	{	if (url) 
		{	$("img", photoElt).attr("src",url+"?"+new Date().getTime())
					.data("photo",url)
					.show();
			$(".fa-stack", photoElt).hide();
		}
		else
		{	if (button=='del')
			{	$("img", photoElt).attr("src","")
						.data("photo",false)
						.hide();
				$(".fa-stack", photoElt).show();
			}
		}
	},
	null,
	{	prompt: "Ajouter une photo",
		message: this.mesagePhoto,
		name: "TMP/photo.jpg",
		buttons: $("img", photoElt).attr("src") ? { del:"supprimer", cancel:"annuler" } : false,
		targetWidth: self.param.width || 1200,
		targetHeight: self.param.heigth || 1200,
		correctOrientation: (self.param.imgOrient!==false)
	});
};