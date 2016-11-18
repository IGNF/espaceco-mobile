/** Gestion de l'aide
*/

(function(){

var helpDiv;
var step = 0;
var _timeout;
var _current = "";
var _param = JSON.parse(localStorage['WebApp@help']||"{}");

/** Save app parameters (to localStorage)
*/
function saveParam(t)
{	if (t) _param[t] = true;
	localStorage['WebApp@help'] = JSON.stringify(_param);
};

function resetParam()
{	_param={};
	saveParam();
}
	
function nextHelp(s)
{	if (!helpDiv) return;
	if (s) step=s;
	else step++;
	if (_timeout) clearTimeout(_timeout);
	helpDiv.show();
	_timeout = setTimeout(function(){ helpDiv.removeClass().addClass('visible step step_'+step).addClass(_current); }, 200);
};

function hideHelp()
{	if (!helpDiv) return;
	helpDiv.removeClass();
	if (_timeout) clearTimeout(_timeout);
	_timeout = setTimeout(function(){ helpDiv.hide(); },500);
}

function showHelp(template)
{	// Deja fait !
	if (_param[template]) 
	{	hideHelp();
		return;
	}
	// Nouvel aide
	saveParam(template);
	var t = CordovApp.template("help/"+template);
	if (!t)
	{	hideHelp();
		return;
	}

	if (!helpDiv)
	{	helpDiv = $("<div>").attr("id", "help").appendTo("body");
	}
	
	_current = template;
	helpDiv.html("").removeClass().addClass("visible "+template).append(t).show();
	$(".close", t).on("click touchstart", function(e)
	{	e.stopPropagation();
		e.preventDefault();
		hideHelp();
	});
	nextHelp(1);
}

/** @namespace 
*/
CordovApp.prototype.help = 
{	/** Show help
	*/
	show: showHelp,
	/** Hide help
	*/
	hide: hideHelp,
	/** Show next help page
	*/
	next: nextHelp,
	/** Reset help
	*/
	reset: resetParam
};

$(document).on("showpage", function(e)
{	showHelp(e.page);
});
$(document).on("hidepage", function(e)
{	hideHelp();
});
$(document).on("menu", function(e)
{	if (e.show) showHelp("menu");
	else hideHelp();
});
$(document).on("ready", function(e)
{	showHelp("main");
});

})();
