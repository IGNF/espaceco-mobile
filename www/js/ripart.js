/** Recuperation des signalements de l'espace collaboratif.


Documentation : https://qlf-collaboratif.ign.fr/collaboratif-site/api-doc/georem

http://developer.telerik.com/featured/securing-phonegapcordova-hybrid-mobile-app/
iOS : https://github.com/shazron/KeychainPlugin

Authorisations
https://forum.ionicframework.com/t/how-to-set-authorization-header-in-ng-cordova-file-transfer-plugin/14891

@constructor

*/
var RIPart = function(options)
{	options = options || {};
	// Url du service
	var url = options.url || "https://espacecollaboratif.ign.fr/api/";
	var user = options.user;
	var pwd = options.pwd;
	
	/** Changement de l'url du service
	* @param {String} url du service
	*/
	this.setServiceUrl = function(u)
	{	url = u;
	};

	/** Recupere l'url du service
	* @return {String} url du service
	*/
	this.getServiceUrl = function()
	{	return url;
	};

	/** Changement d'utilisateur
	* @param {String} user
	* @param {String} password
	*/
	this.setUser = function(u, p)
	{	user = u;
		pwd = p;
	};

	/* Decode l'erreur */
	function responseError (d)
	{	var error = d.find("REPONSE ERREUR");
		var status = error.attr("code");
		// console.log(status+" : "+error.text())
		return ( status=="OK" ? false : { error:true, status: status, statusText: error.text() } );
	}

	/* Decode une georem */
	var georemAttr = { id:"ID_GEOREM", autorisation:"AUTORISATION", url:"LIEN", source:"SOURCE", version:"VERSION",
		date:"DATE", valid:"DATE_VALID", maj:"MAJ", 
		lon:"LON", lat:"LAT", statut:"STATUT",
		id_dep:"ID_DEP", dep:"DEPARTEMENT", commune:"COMMUNE", comment:"COMMENTAIRE", 
		auteur:"AUTEUR", id_auteur:"ID_AUTEUR", groupe:"GROUPE", id_groupe:"ID_GEOGROUPE",
		doc:"DOC" };
	var themeAttr = { groupe:"ID_GEOGROUPE", nom:"NOM" };
	var georepAttr = { id:"ID_GEOREP", auteur:"AUTEUR", id_auteur:"ID_AUTEUR", 
		titre:"TITRE", date:"DATE", statut:"STATUT", comment:"REPONSE" };

	/* Formater les attributs en texte (pour affichage)
	* @param {Object} vals a list of key/values
	* @return {string} formated attributes
	*/
	var formatAttributString = this.formatAttributString = function(vals)
	{	var v = "";
		if (vals) for (var i in vals)
		{	if (vals[i] || vals[i]===false) v += i+": "+(vals[i]===false ? "0" : (vals[i]===true ? "1":vals[i]))+"; "
		}
		return v;
	};

	function getGeorem (rem)
	{	var r = {};
		for (var i in georemAttr)
		{	r[i] = rem.find("> "+georemAttr[i]).first().text();
		}
		r.lon = Number(r.lon);
		r.lat = Number(r.lat);
		r.croquis = (rem.find('CROQUIS').length>0);
		r.themes = [];
		r.attText="";
		rem.find("THEME").each(function()
		{	var th = {};
			th.nom = $(this).find("NOM").text();
			th.id_groupe = $(this).find("ID_GEOGROUPE").text();
			th.groupe = $(this).attr("groupe");
			var attribut = {};
			var nb = 0;
			$(this).find("ATTRIBUT").each(function()
			{	attribut[$(this).attr('nom')] = $(this).text();
				nb++;
			});
			if (nb) th.attribut = attribut;
			r.attText += formatAttributString(attribut);
			r.themes.push(th);
		});
		r.rep = [];
		rem.find("GEOREP").each(function()
		{	var rep = {};
			for (var i in georepAttr)
			{	rep[i] = $(this).find(georepAttr[i]).first().text();
			}
			r.rep.push(rep);
		});
		//console.log(r);
		return r;
	};

	/* Requete sur l'espace collaboratif
	* @param {String} action a realiser
	* @param {Object} liste des parametres a envoyer lors de l'action
	* @param {function} fonction de decodage xml => json
	* @param {function} callback (response, error)
	*/
	function sendRequest (action, options, decode, cback)
	{	if (!user || !pwd) 
		{	if (cback) cback(null, { error:true, status: 401, statusText: "Unauthorized" });
			return false;
		}
		// Transfert OK
		function win (resp)
		{	var r={};
			var error = responseError($(resp));
			if (!error) r = decode($(resp));
			// Callback
			if (cback) cback(r,error);
			else console.log(r);
		};
		// Ooops
		function fail (resp)
		{	// Callback
			if (cback) cback( null, { error: true, status: resp.status, statusText: resp.statusText });
			else console.log("ERROR: "+resp.status);
		};

		// Envoyer avec fichier joint (via FileTransfer)
		if (options.photo)
		{	CordovApp.File.getFile(options.photo,
				function(fileEntry)
				{	// Options
					var trOptions = new FileUploadOptions();
					trOptions.fileKey = "file-0";
					trOptions.fileName = "image_"+new Date().getTime()+".jpg";
					delete options.photo;
					trOptions.params = options;
					// Authentification
					var hash = btoa(user+":"+pwd);
					trOptions.headers = { 'Authorization': "Basic "+hash };
					// Transfert
					var ft = new FileTransfer();
					ft.upload
					(	fileEntry.toURL(), 
						url+"georem/"+action+".xml", 
						function(r)
						{	win(r.response); 
						},
						function(r)
						{	r.status = r.http_status;
							if (r.status == 401)
							{	r.statusText = "Unauthenticated"; 
							}
							else 
							{	switch (r.code)
								{	case FileTransferError.FILE_NOT_FOUND_ERR: 
										r.statusText = "File not found"; 
										break;
									case FileTransferError.INVALID_URL_ERR: 
										r.statusText = "Invalid URL"; 
										break;
									case FileTransferError.CONNECTION_ERR: 
										r.statusText = "Connection error"; 
										break;
									case FileTransferError.ABORT_ERR: 
										r.statusText = "Operation aborted"; 
										break;
									case FileTransferError.NOT_MODIFIED_ERR: 
										r.statusText = "Not modified"; 
										break;
									default: 
										r.statusText = "Unknown error"; 
										break;
								}
							}
							fail(r);
						},
						trOptions
					);		
				},
				function() 
				{	fail({ status:0, statusText: "File not found" });
				}
			);
		}
		// Sans fichier joint
		else
		{	$.ajax
			({	type: /post/.test(action) ? "POST" : "GET",
				url: url+"georem/"+action+".xml",
				dataType: 'xml',
				cache: false,
				// Bug with user/pwd in Android 4.1
				beforeSend: function(xhr){ xhr.setRequestHeader("Authorization", "Basic " + btoa(user + ":" + pwd)); },
				/*
				username: user,
				password: pwd,
				statusCode: 
				{	401: function (data) 
					{	// alert('401: Unauthenticated');
					}
				},
				*/
				data: options,
				success: win,
				error: fail
			});
		}
		return true;
	}

	/** Recuperer les info de l'utilisateur connecte
	* @param {function} callback function (response, error)
	*/
	this.getUserInfo = function (cback)
	{	// Decodage de la reponse
		function decode(resp)
		{	var r = {};
			r.auteur =
				{	nom: resp.find("AUTEUR NOM").text(),
					statut: resp.find("AUTEUR STATUTXT").text()
				};
			r.profil = 
				{	id: Number(resp.find("PROFIL ID_GEOPROFIL").text()),
					titre: resp.find("PROFIL TITRE").text(),
					id_groupe: Number(resp.find("PROFIL ID_GEOGROUPE").text()),
					groupe: resp.find("PROFIL GROUPE").text(),
					logo: resp.find("PROFIL LOGO").text(),
					filtre: resp.find("PROFIL FILTRE").text()
				};
			r.groupes = [];
			resp.find("GEOGROUPE").each(function()
			{	var att = $(this);
				r.groupes.push(
				{	nom: att.find("NOM").text(),
					id_groupe: Number(att.find("ID_GEOGROUPE").text())
				});
			});
			r.themes = [];
			var t, th = {};
			resp.find("THEMES THEME").each(function()
			{	var att = $(this);
				t = 
				{	nom: att.find("NOM").text(),
					id_groupe: Number(att.find("ID_GEOGROUPE").text()),
					attributs: []
				};
				r.themes.push(t);
				th[t.id_groupe+":"+t.nom] = t;
			});
			resp.find("THEMES ATTRIBUT").each(function()
			{	var att = $(this);
				var vals = att.find("VAL");
				for (var i=0; i<vals.length; i++) vals[i] = $(vals[i]).text();
				th[att.find("ID_GEOGROUPE").text()+":"+att.find("NOM").text()].attributs.push(
					{	att: att.find("ATT").text(),
						type: att.find("TYPE").text(),
						val: vals
					});
			});
			return r;
		}
		// Demander au serveur
		return sendRequest ("geoaut_get", {}, decode, cback);
	};

	/** Recuperer les info d'une remontee
	* @param {String} id de la remontee
	* @param {function} callback function (response, error)
	*/
	this.getGeorem = function (id, cback)
	{	// Decodage de la reponse
		function decode(resp)
		{	return getGeorem (resp.find("GEOREM"));
		}
		// Demander au serveur
		return sendRequest ("georem_get/"+id, {}, decode, cback);
	};

	/** Recuperer un ensemble de remontees
	* @param {Object} options de la requete { offset, limit, territory, departement, group, status, box, ... }
	* @param {function} callback function (response, error)
	*/
	this.getGeorems = function (params, cback)
	{	if (!params) params={};
		// Decodage de la reponse
		function decode(resp)
		{	var r = [];
			resp.find("GEOREM").each(function()
			{	r.push (getGeorem($(this)));
			});
			return r;
		}
		// Demander au serveur
		return sendRequest ("georems_get", params, decode, cback);
	};

	/** Envoyer une remontee
	* @param {Object} list des parametres a envoyer { comment, geometry, lon,lat, territory, attributes, sketch, features, proj, insee, protocol, version, photo }
	* @param {function} callback function (response, error)
	*/
	this.postGeorem = function (params, cback)
	{	// Bad command
		if (!params || !params.comment) return false;
		if (!params.hasOwnProperty('geometry') && (!params.hasOwnProperty('lon') || !params.hasOwnProperty('lat'))) return false;
		// Post parameters
		var post = 
		{	comment: params.comment,
			geometry: params.geometry || "POINT("+params.lon+" "+params.lat+")",
			territory: params.territory || "FXX",
		};
		// Optional attributes
		if (params.sketch) post.sketch = params.sketch;
		else if (params.features)
		{	post.sketch = this.feature2sketch(params.features, params.proj);
		}
		if (params.id_groupe>0) post.group = params.id_groupe;
		post.attributes = "";
		if (params.themes) post.attributes = params.themes;
		if (params.attributes) post.attributes += params.attributes;
		if (params.insee) post.insee = params.insee;
		if (params.protocol) post.protocol = params.protocol;
		if (params.version) post.version = params.version;
		if (params.photo) post.photo = params.photo;
		// Decode response
		function decode(resp)
		{	return getGeorem (resp.find("GEOREM"));
		}
		// Send request
		return sendRequest ("georem_post", post, decode, cback);
	};

	/** Write feature(s) to sketch
	* @param {ol.feature|Array<ol.feature>} the feature(s) to write
	* @param {ol.proj.ProjectionLike} projection of the features
	* @return {String} the sketch
	*/
	this.feature2sketch = function(f , proj)
	{	if (!f) return "";
		if (!(f instanceof Array)) f = [f];
		var croquis = "";
		var symb = "<symbole><graphicName>circle</graphicName><diam>2</diam><frontcolor>#FFAA00;1</frontcolor><backcolor>#FFAA00;0.5</backcolor></symbole>";
		var pt = f[0].getGeometry().getFirstCoordinate();
		if (proj)
		{	pt = ol.proj.transform(pt, proj, 'EPSG:4326')
		}
		croquis += "<contexte><lon>"+pt[0].toFixed(7)+"</lon><lat>"+pt[1].toFixed(7)+"</lat><zoom>15</zoom><layers><layer>GEOGRAPHICALGRIDSYSTEMS.MAPS</layer></layers></contexte>";
		var format = new ol.format.GML({ featureNS:'', featurePrefix: 'gml', extractAttributes: false });
		for (var i=0; i<f.length; i++)
		{	var t=""; 
			var geo="", g = f[i].getGeometry().getCoordinates();
			if (proj)
			{	g = ol.proj.transform(g, proj, 'EPSG:4326')
			}
			// Geometry
			switch (f[i].getGeometry().getType())
			{	case 'Point': 
					t = 'Point'; 
					g = [g];
					geo = "<geometrie><gml:Point><gml:coordinates>COORDS</gml:coordinates></gml:Point></geometrie>";
					break;
				case 'LineString': 
					t = 'Ligne'; 
					geo = "<geometrie><gml:LineString><gml:coordinates>COORDS</gml:coordinates></gml:LineString></geometrie>";
					break;
				case 'Polygon': 
					t = 'Polygone'; 
					g = g[0];
					geo = "<geometrie><gml:Polygon><gml:outerBoundaryIs><gml:LinearRing><gml:coordinates>COORDS</gml:coordinates></gml:LinearRing></gml:outerBoundaryIs></gml:Polygon></geometrie>";
					break;
			}
			// Attributes
			var att = f[i].getProperties();
			var attr = "";
			delete att.geometry;
			for (a  in att) 
			{	attr += '<attribut name="'+a.replace('"',"_")+'">'
					+ String(att[a]).replace(/\&/g,"&amp;").replace(/</g,"&inf;").replace(/>/g,"&sup;") 
					+'</attribut>';
			}
			attr = "<attributs>"+attr+"</attributs>";
			// Write!
			if (t)
			{	var coords="";
				for (var k=0; k<g.length; k++) coords += (k>0?" ":"") + g[k][0].toFixed(7) +","+ g[k][1].toFixed(7);
				croquis += "<objet type='"+t+"'><nom></nom>" + symb + attr + geo.replace('COORDS', coords) + "</objet>";
			}
		}
		croquis = "<CROQUIS xmlns:gml='http://www.opengis.net/gml' version='1.0'>"+croquis+"</CROQUIS>";
		return croquis;
	};

	/** Save connection parameters to localstorage
	*/
	this.saveParam = function()
	{	var pwd = this.param.pwd;
		if (!window.cordova) delete this.param.pwd;
		localStorage['WebApp@ripart'] = JSON.stringify(this.param);
		this.param.pwd = pwd;
		this.onUpdate();
	};

	if (localStorage['WebApp@ripart']) this.param = JSON.parse(localStorage['WebApp@ripart']);
	else this.param = { georems:[], nbrem:0 };

	this.initialize(options);
};

/** Initialize function 
* @api
*/
RIPart.prototype.initialize = function(options) {};

/** Samething has changed
* @api
*/
RIPart.prototype.onUpdate = function() {};


/** Transform date to ISODateString YYYY-MM-DD HH:MM:SS
*/
Date.prototype.toISODateString = function()
{	var d = new Date();
	return d.getFullYear() + "-" + 
		("00" + d.getDate()).slice(-2) + "-" + 
		("00" + (d.getMonth() + 1)).slice(-2) + " " + 
		("00" + d.getHours()).slice(-2) + ":" + 
		("00" + d.getMinutes()).slice(-2) + ":" + 
		("00" + d.getSeconds()).slice(-2);
};