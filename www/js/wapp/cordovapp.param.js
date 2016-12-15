/**
	@brief: Cordova web application 
	@author: Jean-Marc Viglino (ign.fr)
	@copyright: IGN 2015
	
	@require: JQuery
*/

// Transform date to ISODateString
Date.prototype.toISODateString = function()
{	return this.toISOString().replace(/T.*/,"")
};

/** Connect parameters to data-input div 
* @param {object} elt jQuery element that contains data-input
* @param {object} param objet with key corresponding to data-param
* @param {function} onchange a function that triggers change on params
* @return {Object} to retrieve param and to reflect changes on values
*/
CordovApp.prototype.setParamInput = function(elt, param, onchange)
{	var self = this;
	elt = $(elt);
			
	function setValue (elt, v)
	{	var p = elt.data("param");
		switch (elt.data("input"))
		{	case "check":
				if (typeof(v)!="boolean") v = elt.data("default");
				if (v) elt.addClass("checked");
				else  elt.removeClass("checked");
				break;
			case "select":
				var found = false;
				$('[data-input-role="option"]', elt).each(function()
				{	if ($(this).data('val')==v) 
					{	found = true;
						$(this).addClass("selected");
					}
					else $(this).removeClass("selected");
				});
				if (!found) v = $('[data-input-role="option"][data-default]', elt).addClass("selected").data('val');
				break;
			case "date":
			case "number":
			case "text":
				if (typeof(v)=="undefined") v = elt.data('default');
				$("input", elt).val(v);
				break;
			default: break;
		}
		if (p) param[p] = v;
		if (onchange) onchange ({ name:p, param:param, val:v });
	}

	// Connect param to data-input
	$("[data-input]", elt).each(function()
		{	var $this = $(this);
			var p = $this.data('param');
			if (p) setValue ($this, param[p]);
		})
		.unbind("click")
		.on("click", function(e)
		{	if ($(this).data('disabled')) return;
			if ($(e.target).is("input") || $(e.target).hasClass("clear-input")) return;
			e.stopPropagation();
			//e.preventDefault();
			var $this = $(this);
			var p = $this.data('param');
			if (param.hasOwnProperty(p))
			{	switch ($this.data('input'))
				{	case "check":
						setValue ($this, !$this.hasClass("checked"));
						break;
					case "select":
						var s0, s = {};
						var l = $("[data-input-role]", $this);
						for (var i=0; i<l.length; i++)
						{	var li = $(l[i]);
							s[li.data('val')]=li.html();
							if (li.hasClass("selected")) s0 = li.data('val');
						}
						self.selectDialog(s, s0, function(c)
						{	setValue ($this, c);
						});
						break;
					default: break;
				};
			}
			// Flash active input
			$this.addClass("active");
			setTimeout (function(){ $this.removeClass("active"); },200);
		})
		.unbind("change")
		.on("change", function()
		{	var $this = $(this);
			var p = $(this).data('param');
			switch ($this.data('input'))
			{	case "text": 
				case "date": 
				case "number": 
					param[p] = $("input", $this).val();
					break;
				default: break;
			}
			if (onchange) 
			{	if (param.hasOwnProperty(p))
				{	onchange ({ name:p, param:param, val:param[p] });
				}
			}
		});

	/** @return {Object} 
	*/
	return {
		/* Retrieves the parameters */
		getParams: function() { return param },
		/* Take into account changes on paramters values */
		change: function()
		{	$("[data-input]", elt).each(function()
			{	var $this = $(this);
				var p = $this.data('param');
				setValue ($this, param[p]);
			});
		}
	}
};

/** Set a [data-input="select"] to prompt for values on click
*	@param {selector} input a data-input="select" with data-input-role="option"
*	@param {String} value the default value (must be a data-val of data-input-role="option")
*	@param {function} onchange a callback function(val)
*	@return {String} the selected value
*/
CordovApp.prototype.selectInput = function(input, value, onchange)
{	var self = this;
	input = $(input);
	var l = $("[data-input-role]", input);
	function setValue (val)
	{	var lfound;
		for (var i=0; i<l.length; i++)
		{	if ($(l[i]).data('val')==val) lfound = $(l[i]);
		}
		if (lfound) 
		{	l.removeClass('selected');
			lfound.addClass('selected');
			input.data('val', val);
		}
	}
	setValue(value);
	input.unbind("click")
		.click(function()
		{	var s0, s = {};
			for (var i=0; i<l.length; i++) 
			{	var li = $(l[i]);
				if (li.data('val'))
				{	s[li.data('val')] = li.html();
					if (li.hasClass("selected")) s0 = li.data('val');
				}
			}
			self.selectDialog(s, s0, function(c)
			{	setValue(c);
				if(onchange) onchange(c);
			});
		});
	return input.data('val');
}

/** Get the [data-input="select"] selected value
*	@param {selector} input a data-input="select" with data-input-role="option"
*	@return {String} the selected value
*/
CordovApp.prototype.selectInputVal = function(input)
{	return $("[data-input-role].selected", input).data("val");
}

/** Get the [data-input="select"] selected text
*	@param {selector} input a data-input="select" with data-input-role="option"
*	@return {String} the selected text
*/
CordovApp.prototype.selectInputText = function(input)
{	return $("[data-input-role].selected", input).text();
}

/** Set data-attr according to a list of attribute value
* @param {object} element a jQuery element that contains data-attr
* @param {object} attr attributes to display in element
*/
CordovApp.prototype.dataAttributes = function (element, attr)
{	// console.log(attr);
	var self = this;
	element = $(element);

	function setAttr(obj, a)
	{	// Default value
		if (!a && obj.data("default")) 
		{	if (obj.data("br")) 
			{	obj.html(obj.data("default").replace(/\n/g,"<br/>"));
			}
			else 
			{	obj.text(obj.data("default"));
			}
		}
		else if (a)
		{	// Conditionnal display
			if (obj.data("nnull")) obj.show();
			else if (obj.data("null")) obj.hide();
			else if (obj.data("match"))
			{	var rex = new RegExp(obj.data("match"));
				if (rex.test(a)) obj.show();
				else obj.hide();
			}
			// Serialize array of object
			else if (obj.data("format-array"))
			{	if (a instanceof Array)
				{	var f = obj.data("format-array");
					var t = "";
					for (var i=0; i<a.length; i++)
					{	var ti=f;
						for (var k in a[i])
						{	ti = ti.replace("%"+k+"%", a[i][k]);
						}
						t += (t.length ? (obj.data("sep")||"") :"") + ti;
					}
					obj.html(t);
				}
			}
			// Size of an array
			else if (obj.data("array-length"))
			{	obj.html(a.length);
			}
			else
			{	if (obj.data("format"))
				{	switch (obj.data("format"))
					{	case "date:year":
							var y = a.split('/')[2];
							if (y) a = y;
							break;
						default: break;
					}
				}
				var eq, neq;
				if (obj.data("eq")) eq = attr[obj.data("eq")];
				if (obj.data("neq")) neq = attr[obj.data("neq")];
				if (neq || eq) 
				{	if ((neq && a!=neq) || (eq && a==eq)) obj.show();
					else obj.hide();
				}
				else 
				{	if (obj.data("br")) 
					{	obj.html((obj.data("prefix") || "") + a.replace(/\n/g,"<br/>") + (obj.data("suffix") || "") );
					}
					else 
					{	obj.text((obj.data("prefix") || "") + a + (obj.data("suffix") || "") );
					}
				}
			}
		}
		else 
		{	if (obj.data("nnull") || obj.data("eq") || obj.data("neq")) obj.hide();
			else if (obj.data("match")) obj.hide();
			else if (obj.data("null")) obj.show();
			else obj.text("");
		}
	}
	
	// Set url
	$('a[data-href]', element).each(function()
	{	var ref = $(this).data('href');
		$(this).attr("href", attr[ref]);
	});
	// Set Attributes
	$('[data-attr]', element).each(function()
	{	var att = $(this).data("attr");
		setAttr($(this), attr[att]);
	});
	// Set attributes / codes
	$('[data-code]', element).each(function()
	{	var att = $(this).data("code");
		if (self.codes[att] && attr[att])
			setAttr($(this), self.codes[att][attr[att]]);
	});
	// Set class / attributes 
	$('[data-class]', element).each(function()
	{	var att = $(this).data("class").split("=");
		att = att[0];
		$(this).attr("data-class",att+"="+attr[att]);
	});
};
