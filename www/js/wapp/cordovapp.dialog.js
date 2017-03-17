/**
	@brief: Cordova web application 
	@author: Jean-Marc Viglino (ign.fr)
	@copyright: 2015
	
	@require: JQuery
*/

(function(){
/** @namespace Dialog
 * @classdesc
 * Dialogues pour l'applicaiton 
 * @constructor
 * @private
 */
function Dialog()
{	var self = this;
	// Constructor
	var _back = $('<div>').attr("data-role","backDialog").appendTo("body");
	var _dlg = $('<div>').attr("data-role","dialog").appendTo("body").hide();
	var _cbox = $("<i>").addClass("fa fa-close")
			.attr("data-role","closebox")
			.appendTo(_dlg)
			.on ("click",function(e)
			{	e.stopPropagation();
				e.preventDefault();
				self.close();
			});
	var _title = $("<div>").addClass("title").appendTo(_dlg);
	var _content = $("<div>").addClass("content").appendTo(_dlg);
	var _buttons = $("<div>").addClass("buttons").appendTo(_dlg);
	var _timeout = null;

	/** A dialog is shown on the app
	* @method Dialog.isOpen
	* @return {bool} true if a dialog is shown
	*/
	this.isOpen = function()
	{	return (_dlg && _dlg.hasClass("visible"));
	};

	/** Close the dialog 
	* @method Dialog.close
	* @return {bool} true if a dialog is closed
	*/
	this.close = function ()
	{	var self = this;
		if (!this.isOpen()) return false;
		_dlg.removeClass('visible');
		_back.hide();
		if (_timeout) clearTimeout(_timeout);
		_timeout = setTimeout (function(){ _dlg.hide(); }, 200);
		return true;
	};

	/** Show a new dialog 
	* @method Dialog.show
	* @param {html} a jQuery objet that contents the dialog
	* @param {options}
	*	- closeBox {bool} ass a close box
	*	- title {string} title of the dialog
	*	- buttons {Array<String>} list of button to show 
	*	- callback {function} callback function with index of pressed button as argument
	*	- className {String} dialog class for css 
	*/
	this.show = function (content, options)
	{	if (!options) options={};
		var self = this;
		if (_timeout) clearTimeout(_timeout);

		function addButton(id, text)
		{	$("<div>").text(text)
					.attr("data-role","dialogBt")
					.prependTo(_buttons)
					.on ("click",function(e)
					{	e.stopPropagation();
						e.preventDefault();
						self.close();
						if (options.callback) options.callback(id);
					});
		}

		if (options.closeBox) _cbox.show();
		else _cbox.hide();
		if (options.title) _title.html(options.title).show();
		else _title.hide();
		if (options.noClose && _dlg.hasClass('visible'))
		{	_dlg.removeClass().addClass('visible');
		}
		else
		{	_dlg.removeClass();
		}
		_dlg.addClass(options.className||options.classe);
		
		_buttons.html("");
		if (options.buttons)
		{	if (options.buttons.length) 
			{	for (var i=0; i<options.buttons.length; i++)
				{	addButton (i+1, options.buttons[i]);
				}
			}
			else
			{	for (var i in options.buttons)
				{	addButton (i, options.buttons[i]);
				}
			}
		}
		else addButton(1, _T("annuler"));

		_back.show();
		_content.html(content)
		_dlg.show();
		_timeout = setTimeout (function(){ _dlg.addClass('visible'); }, 200);
	}
};

/** Application Dialog
* @member {Dialog}
*/
CordovApp.prototype.dialog = new Dialog();

var _internalDialog = new Dialog();

/** Select dialog
* @param {key/val} choice list of choice key/value
* @param {String} selected key of selected item
* @param {function} callback function(key) return the selected key
* @param {Object} options (dialog options
*	- search {boolean} add a search input
*/
CordovApp.prototype.selectDialog = function(choice, valdef, cback, options)
{	if (!options) options = {};
	if (typeof(cback) != "function") cback = function(c){ console.log(c); };
	var content = $("<div>");
	var ul = $("<ul>").attr("data-role","select").appendTo(content);
	var nb = 0;
	var selected = false;
	for (var i in choice)
	{	nb++;
		$("<li>").html(choice[i])
			.data("item",i)
			.addClass(i==valdef ? "selected" : "")
			.on("click", function(e)
			{	e.stopPropagation();
				e.preventDefault();
				$("li", this.parent).removeClass("selected");
				$(this).addClass("selected");
				if (!options.confirm) 
				{	_internalDialog.close();
					cback($(this).data('item'));
				}
				else selected = $(this).data('item');
			})
			.appendTo(ul);
	}
	// Filter option
	if (nb > (options.search ? 0:20))
	{	$('<i class="clear-input">').prependTo(content);
		$('<input type="text">')
			.addClass("search")
			.attr("placeholder","filtrer...")
			.on("keyup change", function(e)
			{	var filter = new RegExp($(this).val(), "i");
				$("li", ul).each(function()
				{	if (!filter) $(this).show();
					else
					{	if (filter.test($(this).text())) $(this).show();
						else $(this).hide();
					}
				});

			})
			.prependTo(content);
		$('<i class="search-input">').prependTo(content);
	}
	if (options.confirm) 
	{	options.buttons = { ok: "ok", cancel:"annuler" };
		options.callback = function (bt)
		{	if (selected && bt=="ok") cback(selected);
		}
	}
	_internalDialog.show(content, options);
};

/** Prompt dialog
* @param {String} Prompt
* @param {String} default value
* @param {function} callback function(val) returned value
* @param {Object} Dialog param
*/
CordovApp.prototype.prompt = function(prompt, val, cback, options)
{	if (!options) options = {};
	if (typeof(cback)!="function") cback=function(c){console.log(c);};
	var content = $("<div>");
	var input = $("<input>")
		.attr({type:"text", placeholder:options.placeholder})
		.appendTo(content);
	$("<i>").addClass("clear-input").appendTo(content);
	options.callback = function(b)
	{	if (b=="ok") cback(input.val());
		else cback(val);
	}
	options.title = prompt;
	options.buttons = { cancel:"Annuler", ok:"OK" };
	_internalDialog.show(content, options);
	input.focus().val(val || "");
};

/** Show an alert
*	@param {String} message to alert
*	@param {String} title for the dialod
*/
CordovApp.prototype.alert = function (what, titre, classe)
{	_internalDialog.show(what||"oops",
	{	title: titre||_T("ALERTE"),
		buttons: ["OK"],
		classe: classe||"alert"
	});
}
	
/** Show a message 
*	@param {String} message to alert
*	@param {String} title for the dialod
*	@param {Array<String>} list of button labels
*	@param {function} callback function with index of pressed button as argument
*/
CordovApp.prototype.message = function (message, titre, boutons, callback, classe)
{	_internalDialog.show(message||"...",
	{	title: titre||_T("MESSAGE"),
		callback: callback,
		buttons: boutons,
		classe: classe||"message"
	});
}

/** A dialog is open
*/
CordovApp.prototype.hasDialog = function()
{	return ( this.dialog.isOpen() || _internalDialog.isOpen() );
};

/** Close first open dialog
*/
CordovApp.prototype.closeDialog = function()
{	if (_internalDialog.isOpen())
	{	return _internalDialog.close();
	}
	else 
	{	return this.dialog.close();
	}
};


/** Notification
*/
var _notification=null;
var _timeout = null;

/** Show a notification on the bottom of the screen
* @param {String} notification
* @param {Number|String} duration (number in ms or a string "1s"/"1000ms") before the notification vanish (0 close the notificatoin), default 3s
*/
CordovApp.prototype.notification = function(msg, duration)
{	if (!_notification)
	{	_notification = $("<div>").attr("data-role","notification").appendTo("body");
	}

	if (!msg && !duration) 
	{	if (_timeout) clearTimeout(_timeout);
		_notification.removeClass('visible'); 
		_notification.hide();
		return;
	}
	
	if (typeof(duration)=="string")
	{	if (/ms$/.test(duration)) duration = parseFloat(duration);
		else if (/s$/.test(duration)) duration = parseFloat(duration)*1000;
	}
	if (typeof(duration)!="number") duration=0;
	duration = duration ? Math.max(duration,500) : 3000;

	_notification.html("<div>"+msg+"</div>").show();
	setTimeout (function(){ _notification.addClass('visible'); }, 200);
	if (_timeout) clearTimeout(_timeout);
	_timeout = setTimeout (function()
	{	_notification.removeClass('visible'); 
		setTimeout (function(){ _notification.hide(); }, 200);
	}, duration);
}

/** Wait dialog
*/
var _wait=null, _wback=null, _message=null;
var _wtimeout = null;

/** Wait dialog
* @param {String|false} message to show or false to hide the dialog
* @param {boolean} false to prevent animation (to chain dialogs)
*/
CordovApp.prototype.wait = function(msg, anim)
{	if (!_wait)
	{	_wback = $("<div>").attr("data-role","backDialog").appendTo("body");
		_wait = $("<div>").attr("id","wait").attr("data-role","dialog").appendTo("body");
		var spin = $("<i>").addClass("fa fa-spinner fa-pulse")
						.appendTo(_wait);
		_message = $("<div>").insertAfter(spin);
	}
	if (_wtimeout) clearTimeout(_wtimeout);
	if (msg !== false) 
	{	_wback.show();
		_wait.show();
		_message.html(msg);
		if (!_wait.hasClass('visible')) 
		{	if (anim===false) _wait.addClass('visible noanim');
			else _wtimeout = setTimeout (function() { _wait.addClass('visible'); }, 200);
		}
	}
	else 
	{	_wback.hide();
		_wait.removeClass('visible noanim');
		if (anim===false) _wait.hide();
		else _wtimeout = setTimeout (function(){ _wait.hide(); }, 200);
	}
}

CordovApp.prototype.isWaiting = function()
{	return _wback.css("display")!="none";
	//return _wait.hasClass('visible');
}

})();
