/**
 * 
 */

/** Prendre une photo
	@param {function} win (url, button)  callback (renvoie l'url du fichier)
	@param {function} fail (message) Erreur
	@param {} param parametre de prise de vue
	- name : nom du fichier ("TMP/img.jpg" ou "DIR/img.jpg") si null renvoie un fichier temporaire
	- prompt : prompt pour le choix de la source
	- buttons : list of buttons default {cancel:"annuler"}
	@param {enum} source Camera.PictureSourceType.SAVEDPHOTOALBUM ou Camera.PictureSourceType.CAMERA
*/
CordovApp.prototype.getPicture = function (win, fail, param, source)
{	if (!window.Camera) 
	{	wapp.alert ("Impossible d'accéder aux photos...")
		return;
	}
	if (typeof(param) != "object") param = {};
	var self = this;
	// Default buttons
	var bouttons = { photo:"Caméra", album:"Album" };
	if (param.buttons) bouttons = $.extend (bouttons, param.buttons);
	else bouttons.cancel = "annuler";
	// Ask for the source (if none)
	if (!source)
	{	this.message(param.message || "Chercher un image dans un de vos album ou prendre une nouvelle photo.",
			(param.prompt || "Caméra"), 
			bouttons,
			function(button)
			{	switch (button)
				{	case "photo": self.getPicture(win, fail, param, Camera.PictureSourceType.CAMERA ); break;
					case "album": self.getPicture(win, fail, param, Camera.PictureSourceType.SAVEDPHOTOALBUM ); break;
					default: win("", button); break;
				}
			},
			options.className||"photo");
		return;
	}

	// Take a photo
	navigator.camera.getPicture
	(	// on Success
		function(imageURI) 
		{	if (!param.name)
			{	win (imageURI);
				return;
			}
			// Copier la photo dans le repertoire demande
			CordovApp.File.moveFile (imageURI, param.name, 
				function(file)
				{	win (file.nativeURL);
				}
			); 
		}, 
		// On fail
		function(message) 
		{	if (fail) fail(message);
			else if (!message.match(/cancel/)) self.alert(message, "MESSAGE"); 
		},
		// Params
		{	quality: (param.quality ? param.quality : 50),
			correctOrientation: (param.correctOrientation ? true : false),
			targetWidth: (param.targetWidth ? param.targetWidth : 600),
			targetHeight: (param.targetHeight ? param.targetHeight : 600),
			encodingType: (param.encodingType ? param.encodingType : Camera.EncodingType.JPEG),
			destinationType: Camera.DestinationType.FILE_URI,
			sourceType : source 
		}
	);
}